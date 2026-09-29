import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlashcardView } from "@/components/FlashcardView";
import { EmptyState } from "@/components/EmptyState";
import { describeNext, listDueCards, nextDueDate, rateCard, type Rating, type ReviewCard } from "@/lib/srs";

export function ReviewSession({ subjectId, showSubject }: { subjectId?: string; showSubject?: boolean }) {
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [done, setDone] = useState(0);
  const [next, setNext] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cards = await listDueCards(subjectId);
      setQueue(cards);
      if (!cards.length) setNext(await nextDueDate(subjectId));
    } catch {
      setQueue([]);
      toast.error("Não foi possível carregar os flashcards.");
    }
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const card = queue?.[0];

  const onRate = async (rating: Rating) => {
    if (!card || !queue) return;
    try {
      const s = await rateCard(card, rating);
      const rest = queue.slice(1);
      // Cards due again in a few minutes go back to the end of today's session.
      if (s.minutes) rest.push({ ...card, ease: s.ease, intervalDays: s.intervalDays, dueAt: s.dueAt });
      else setDone((d) => d + 1);
      setQueue(rest);
      if (!rest.length) setNext(await nextDueDate(subjectId));
    } catch {
      toast.error("Não foi possível salvar sua resposta.");
    }
  };

  if (queue === null) return <p className="text-sm text-muted-foreground">Carregando flashcards...</p>;

  const header = (
    <div className="card-soft flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-medium">Flashcards para revisar hoje</p>
        <p className="text-xs text-muted-foreground">
          {queue.length} {queue.length === 1 ? "card restante" : "cards restantes"}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{done} revisados</p>
    </div>
  );

  if (!card) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          title="Nenhuma revisão para hoje 🎉"
          description={
            next
              ? `Próxima revisão em ${new Date(next).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}.`
              : "Gere flashcards em uma matéria para começar."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {showSubject && card.subjectName ? (
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{card.subjectName}</p>
      ) : null}
      <FlashcardView
        key={`${card.id}-${card.dueAt}`}
        card={{ id: card.id, subjectId: card.subjectId, front: card.front, back: card.back }}
        hints={{
          Difícil: describeNext(card, "Difícil"),
          Bom: describeNext(card, "Bom"),
          Fácil: describeNext(card, "Fácil"),
        }}
        onRate={onRate}
      />
      <p className="text-center text-xs text-muted-foreground">
        Cada botão mostra quando o card vai voltar para revisão.
      </p>
    </div>
  );
}
