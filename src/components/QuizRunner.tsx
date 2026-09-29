import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { cn } from "@/lib/utils";
import type { Quiz } from "@/data/types";

export function QuizRunner({ quiz, onExit }: { quiz: Quiz; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = quiz.questions.length;
  const question = quiz.questions[index];

  const answer = () => {
    if (selected === null || !question) return;
    const isCorrect = selected === question.correctIndex;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    setSelected(null);
    if (index + 1 >= total) setFinished(true);
    else setIndex(index + 1);
  };

  if (finished) {
    const percent = Math.round((correct / total) * 100);
    return (
      <div className="card-soft space-y-6 p-8 text-center">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Resultado</p>
          <p className="font-serif text-5xl">
            {correct}/{total}
          </p>
          <p className="text-lg font-medium text-primary">{percent}%</p>
        </div>
        <div className="mx-auto flex max-w-xs flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="size-4 text-success" /> Respostas corretas
            </span>
            <span className="font-medium">{correct}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <X className="size-4 text-destructive" /> Respostas incorretas
            </span>
            <span className="font-medium">{total - correct}</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onExit}>
            Voltar
          </Button>
          <Button
            onClick={() => {
              setIndex(0);
              setCorrect(0);
              setSelected(null);
              setFinished(false);
            }}
          >
            Refazer quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft space-y-6 p-6 sm:p-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Questão {index + 1} de {total}
          </span>
          <button type="button" onClick={onExit} className="hover:text-foreground">
            Sair
          </button>
        </div>
        <ProgressBar value={((index + 1) / total) * 100} />
      </div>

      <h3 className="font-serif text-xl leading-snug">{question?.prompt}</h3>

      <div className="space-y-2">
        {(question?.options ?? []).map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
              selected === i
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:border-primary/40 hover:bg-surface",
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </button>
        ))}
      </div>

      <Button className="w-full sm:w-auto" disabled={selected === null} onClick={answer}>
        Responder
      </Button>
    </div>
  );
}
