import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const Body = z.object({
  threadId: z.string().uuid(),
  messages: z.array(z.any()),
});

async function handle(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const { threadId } = parsed.data;
  const messages = parsed.data.messages as UIMessage[];

  const { data: thread } = await supabase
    .from("tutor_threads")
    .select("id, subject_id, title")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return new Response("Not found", { status: 404 });

  const { loadSubjectContext, createGatewayModel, aiProviderOptions } = await import("@/lib/ai.server");
  const { withLovableAiGatewayRunIdHeader } = await import("@/lib/ai-run-id.server");
  const { subject, text } = await loadSubjectContext(supabase, thread.subject_id);

  // Save the latest user message.
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    const { error } = await supabase
      .from("tutor_messages")
      .upsert(
        { user_id: userId, thread_id: threadId, message_id: last.id, role: "user", parts: last.parts as never },
        { onConflict: "thread_id,message_id" },
      );
    if (error) console.error("save user message", error);
    if (thread.title === "Nova conversa") {
      const firstText = last.parts.find((p) => p.type === "text");
      const title = firstText && "text" in firstText ? firstText.text.slice(0, 60) : "Conversa";
      await supabase.from("tutor_threads").update({ title }).eq("id", threadId);
    } else {
      await supabase.from("tutor_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }
  }

  const system = text
    ? `Você é o Tutor IA do StudyAI para a matéria "${subject.name}". Responda SOMENTE com base nos materiais abaixo. Se a resposta não estiver nos materiais, diga claramente que não encontrou essa informação nos materiais enviados. Cite o material e a página quando possível. Seja didático e responda em português do Brasil.\n\nMATERIAIS:\n${text}`
    : `Você é o Tutor IA do StudyAI. Esta matéria ainda não tem materiais processados. Explique ao aluno que ele precisa adicionar materiais na aba "Materiais" para que você possa responder com base neles, e não responda perguntas de conteúdo.`;

  const { model, runIdFetch } = createGatewayModel();
  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: aiProviderOptions,
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onFinish: async ({ responseMessage }) => {
        const { error } = await supabase.from("tutor_messages").upsert(
          {
            user_id: userId,
            thread_id: threadId,
            message_id: responseMessage.id,
            role: "assistant",
            parts: responseMessage.parts as never,
          },
          { onConflict: "thread_id,message_id" },
        );
        if (error) console.error("save assistant message", error);
      },
      onError: (e) => {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 402) return "Os créditos de IA acabaram. Adicione créditos para continuar.";
        if (status === 429) return "Muitas solicitações. Tente novamente em instantes.";
        console.error(e);
        return "Não foi possível responder agora.";
      },
    }),
    runIdFetch,
  );
}

export const Route = createFileRoute("/api/tutor")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
