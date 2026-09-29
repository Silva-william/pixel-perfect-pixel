import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { generateStudyContent } from "@/lib/ai.functions";

type Kind = "summary" | "cards" | "flashcards" | "quiz";

const LABELS: Record<Kind, { title: string; button: string }> = {
  summary: { title: "Nenhum resumo ainda", button: "Gerar resumo" },
  cards: { title: "Nenhum card ainda", button: "Gerar cards" },
  flashcards: { title: "Nenhum flashcard ainda", button: "Gerar flashcards" },
  quiz: { title: "Nenhum quiz ainda", button: "Gerar quiz" },
};

async function load(subjectId: string, kind: Kind): Promise<unknown> {
  if (kind === "flashcards") {
    const { data } = await supabase
      .from("flashcards")
      .select("id, subject_id, front, back")
      .eq("subject_id", subjectId)
      .order("created_at");
    const list = (data ?? []).map((f) => ({ id: f.id, subjectId: f.subject_id, front: f.front, back: f.back }));
    return list.length ? list : null;
  }
  const { data } = await supabase
    .from("generated_content")
    .select("data")
    .eq("subject_id", subjectId)
    .eq("kind", kind)
    .maybeSingle();
  return data?.data ?? null;
}

export function Generated<T>({
  subjectId,
  kind,
  children,
}: {
  subjectId: string;
  kind: Kind;
  children: (data: T, regenerate: ReactNode) => ReactNode;
}) {
  const generate = useServerFn(generateStudyContent);
  const [data, setData] = useState<T | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    load(subjectId, kind).then((d) => setData(d as T | null));
  }, [subjectId, kind]);
  useEffect(reload, [reload]);

  const run = async () => {
    setBusy(true);
    try {
      const res = await generate({ data: { subjectId, kind } });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Conteúdo gerado a partir dos seus materiais.");
        reload();
      }
    } catch {
      toast.error("Não foi possível gerar agora.");
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button variant="outline" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {busy ? "Gerando..." : data ? "Gerar novamente" : LABELS[kind].button}
    </Button>
  );

  if (data === undefined) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data)
    return (
      <EmptyState
        title={LABELS[kind].title}
        description="A IA cria este conteúdo usando apenas os materiais desta matéria."
        action={button}
      />
    );
  return <>{children(data, button)}</>;
}
