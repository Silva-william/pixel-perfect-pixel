import { useState } from "react";
import { ChevronLeft, ChevronRight, HelpCircle, PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import type { KnowledgeCard } from "@/data/types";

export function KnowledgeCards({ cards }: { cards: KnowledgeCard[] }) {
  const [index, setIndex] = useState(0);

  if (!cards.length) {
    return (
      <EmptyState
        title="Nenhum card de conhecimento ainda"
        description="Os cards serão gerados a partir dos seus materiais em uma próxima etapa."
      />
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="card-soft flex min-h-64 flex-col justify-between gap-6 p-8">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {card.label}
        </span>
        <div className="space-y-3">
          <h3 className="font-serif text-3xl uppercase leading-tight">{card.term}</h3>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {card.definition}
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {pad(index + 1)} / {pad(cards.length)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={index >= cards.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            Próximo
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.success("Card marcado como importante.")}
          >
            <Star className="size-4" />
            Marcar como importante
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast("Anotações chegam em uma próxima etapa.")}
          >
            <PenLine className="size-4" />
            Adicionar anotação
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast("Essa funcionalidade será conectada à IA em uma próxima etapa.")
            }
          >
            <HelpCircle className="size-4" />
            Gerar pergunta
          </Button>
        </div>
      </div>
    </div>
  );
}
