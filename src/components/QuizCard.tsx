import { Button } from "@/components/ui/button";
import type { Quiz } from "@/data/types";

export function QuizCard({ quiz, onStart }: { quiz: Quiz; onStart: () => void }) {
  return (
    <div className="card-soft flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-base font-semibold">{quiz.title}</h3>
        <p className="text-xs text-muted-foreground">
          {quiz.questionsCount} questões · Média: {quiz.average}%
        </p>
      </div>
      <Button className="mt-auto w-full" onClick={onStart}>
        Começar quiz
      </Button>
    </div>
  );
}
