import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/data/types";

export function FlashcardView({
  card,
  onRate,
  hints,
}: {
  card: Flashcard;
  hints?: Record<"Difícil" | "Bom" | "Fácil", string>;
  onRate?: (rating: "Difícil" | "Bom" | "Fácil") => void;
}) {
  const [flipped, setFlipped] = useState(false);

  const rate = (rating: "Difícil" | "Bom" | "Fácil") => {
    toast.success(`Flashcard marcado como ${rating.toLowerCase()}.`);
    setFlipped(false);
    onRate?.(rating);
  };

  return (
    <div className="space-y-4">
      <div className="[perspective:1400px]">
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          aria-label="Virar flashcard"
          className="relative block h-64 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-72"
        >
          <div
            className="flip-3d relative size-full"
            style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
          >
            <div className="card-soft backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Pergunta
              </span>
              <p className="font-serif text-2xl leading-snug">{card.front}</p>
              <span className="mt-2 text-xs text-muted-foreground">Clique para ver a resposta</span>
            </div>
            <div
              className="card-soft backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface p-8 text-center"
              style={{ transform: "rotateY(180deg)" }}
            >
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Resposta
              </span>
              <p className="text-base leading-relaxed">{card.back}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => rate("Difícil")}>
          Difícil
          {hints ? <span className="text-xs opacity-70">· {hints["Difícil"]}</span> : null}
        </Button>
        <Button variant="outline" onClick={() => rate("Bom")}>
          Bom
          {hints ? <span className="text-xs opacity-70">· {hints["Bom"]}</span> : null}
        </Button>
        <Button onClick={() => rate("Fácil")}>
          Fácil
          {hints ? <span className="text-xs opacity-70">· {hints["Fácil"]}</span> : null}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Virar" onClick={() => setFlipped((v) => !v)}>
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
