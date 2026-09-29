import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  subjectId: z.string().uuid(),
  kind: z.enum(["summary", "cards", "flashcards", "quiz"]),
});

const PROMPTS: Record<z.infer<typeof Input>["kind"], string> = {
  summary:
    'Escreva um resumo claro do conteúdo (3 a 5 parágrafos) e de 5 a 8 principais pontos. Responda somente com JSON: {"text": string, "keyPoints": string[]}',
  cards:
    'Crie de 8 a 12 cards de conhecimento com os conceitos mais importantes. Responda somente com JSON: {"cards": [{"label": string (categoria curta), "term": string, "definition": string (1 a 3 frases)}]}',
  flashcards:
    'Crie de 10 a 15 flashcards de pergunta e resposta para revisão. Responda somente com JSON: {"flashcards": [{"front": string, "back": string}]}',
  quiz:
    'Crie um quiz com 10 questões de múltipla escolha, cada uma com exatamente 4 opções e uma correta. Responda somente com JSON: {"title": string, "questions": [{"prompt": string, "options": string[], "correctIndex": number (0-3)}]}',
};

export const generateStudyContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { loadSubjectContext, generateTextStreamed, parseJson } = await import("./ai.server");
    const { supabase, userId } = context;
    const { subject, text } = await loadSubjectContext(supabase, data.subjectId);
    if (!text) {
      return { ok: false as const, error: "Adicione e processe ao menos um material nesta matéria primeiro." };
    }

    const system = `Você é um assistente de estudos. Use EXCLUSIVAMENTE o conteúdo dos materiais fornecidos da matéria "${subject.name}". Não invente fatos que não estejam nos materiais. Escreva em português do Brasil.`;
    let raw: string;
    try {
      raw = await generateTextStreamed(system, [
        { role: "user", content: `${PROMPTS[data.kind]}\n\nMATERIAIS:\n${text}` },
      ]);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 402) return { ok: false as const, error: "Os créditos de IA acabaram. Adicione créditos para continuar." };
      if (status === 429) return { ok: false as const, error: "Muitas solicitações. Tente novamente em instantes." };
      console.error(e);
      return { ok: false as const, error: "Não foi possível gerar o conteúdo agora." };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJson(raw);
    } catch {
      return { ok: false as const, error: "A IA retornou um formato inesperado. Tente novamente." };
    }

    if (data.kind === "flashcards") {
      const list = Array.isArray(parsed.flashcards) ? (parsed.flashcards as { front?: string; back?: string }[]) : [];
      const rows = list
        .filter((f) => f.front && f.back)
        .map((f) => ({ user_id: userId, subject_id: data.subjectId, front: String(f.front), back: String(f.back) }));
      await supabase.from("flashcards").delete().eq("subject_id", data.subjectId);
      if (rows.length) {
        const { error } = await supabase.from("flashcards").insert(rows);
        if (error) return { ok: false as const, error: "Não foi possível salvar os flashcards." };
      }
      return { ok: true as const };
    }

    if (data.kind === "quiz" && Array.isArray(parsed.questions)) {
      parsed.questions = (parsed.questions as { prompt?: string; options?: unknown[]; correctIndex?: number }[])
        .filter((q) => q.prompt && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => ({
          prompt: String(q.prompt),
          options: q.options!.slice(0, 4).map(String),
          correctIndex: Math.min(Math.max(Number(q.correctIndex) || 0, 0), Math.min(3, q.options!.length - 1)),
        }));
    }

    const { error } = await supabase
      .from("generated_content")
      .upsert(
        { user_id: userId, subject_id: data.subjectId, kind: data.kind, data: parsed as never },
        { onConflict: "subject_id,kind" },
      );
    if (error) return { ok: false as const, error: "Não foi possível salvar o conteúdo gerado." };
    return { ok: true as const };
  });
