import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  head: () => ({
    meta: [
      { title: "Tutor IA — StudyAI" },
      { name: "description", content: "Converse com o Tutor IA sobre os seus materiais de estudo." },
      { property: "og:title", content: "Tutor IA — StudyAI" },
      { property: "og:description", content: "Converse com o Tutor IA sobre os seus materiais de estudo." },
    ],
  }),
  component: TutorPage,
});

type ThreadInfo = { id: string; title: string; subject_id: string; subjects: { name: string } | null };

function TutorPage() {
  const { threadId } = Route.useParams();
  const [thread, setThread] = useState<ThreadInfo | null | undefined>(undefined);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    setThread(undefined);
    setInitial(null);
    supabase
      .from("tutor_threads")
      .select("id, title, subject_id, subjects(name)")
      .eq("id", threadId)
      .maybeSingle()
      .then(({ data }) => setThread((data as ThreadInfo | null) ?? null));
    supabase
      .from("tutor_messages")
      .select("message_id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at")
      .then(({ data }) =>
        setInitial(
          (data ?? []).map((m) => ({
            id: m.message_id,
            role: m.role as UIMessage["role"],
            parts: m.parts as UIMessage["parts"],
          })),
        ),
      );
  }, [threadId]);

  if (thread === undefined || initial === null)
    return <p className="text-sm text-muted-foreground">Carregando conversa...</p>;
  if (!thread) throw notFound();

  return (
    <div className="space-y-4">
      <Link
        to="/studies/$id"
        params={{ id: thread.subject_id }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para {thread.subjects?.name ?? "a matéria"}
      </Link>
      <ChatWindow key={threadId} threadId={threadId} initial={initial} subjectName={thread.subjects?.name ?? ""} />
    </div>
  );
}

function ChatWindow({
  threadId,
  initial,
  subjectName,
}: {
  threadId: string;
  initial: UIMessage[];
  subjectName: string;
}) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tutor",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message || "Não foi possível responder agora."),
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="card-soft flex h-[calc(100vh-12rem)] min-h-[480px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Tutor IA</p>
          <p className="text-xs text-muted-foreground">Baseado nos materiais de {subjectName}</p>
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Pergunte algo sobre seus materiais"
              description="O tutor responde apenas com o que está nos materiais desta matéria."
              icon={<GraduationCap className="size-6" />}
            />
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Consultando seus materiais...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(msg) => {
            const text = msg.text?.trim();
            if (!text || busy) return;
            void sendMessage({ text });
            setInput("");
          }}
        >
          <PromptInputTextarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faça uma pergunta sobre o conteúdo..."
          />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
