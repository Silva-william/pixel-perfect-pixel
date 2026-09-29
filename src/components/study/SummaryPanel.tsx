import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SummaryDoc } from "@/data/types";

export function SummaryPanel({ summary }: { summary: SummaryDoc }) {
  return (
    <div className="space-y-6">
      <div className="card-soft space-y-3 p-6 sm:p-8">
        <h3 className="font-serif text-2xl">Resumo</h3>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {summary.text}
        </p>
      </div>

      <div className="card-soft space-y-4 p-6 sm:p-8">
        <h3 className="text-base font-semibold">Principais pontos</h3>
        <ol className="space-y-2 text-sm">
          {summary.keyPoints.map((point, i) => (
            <li key={point} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{point}</span>
            </li>
          ))}
        </ol>
      </div>

      <Button
        variant="outline"
        onClick={() => toast("Essa funcionalidade será conectada à IA em uma próxima etapa.")}
      >
        <Sparkles className="size-4" />
        Gerar novo resumo
      </Button>
    </div>
  );
}
