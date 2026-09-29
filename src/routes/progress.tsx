import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, CheckCircle2, Clock, Flame, ListChecks, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  materialsCompleted,
  progressStats,
  quizPerformance,
  weeklyStudyTime,
} from "@/data/mock";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Meu progresso — StudyAI" },
      { name: "description", content: "Tempo estudado, desempenho nos quizzes e materiais concluídos." },
      { property: "og:title", content: "Meu progresso — StudyAI" },
      {
        property: "og:description",
        content: "Tempo estudado, desempenho nos quizzes e materiais concluídos.",
      },
    ],
  }),
  component: ProgressPage,
});

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-soft space-y-4 p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.75rem",
  color: "var(--color-popover-foreground)",
  fontSize: "0.8rem",
};

function ProgressPage() {
  return (
    <>
      <PageHeader title="Meu progresso" subtitle="Acompanhe sua evolução ao longo do tempo." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          value={`${Math.round(progressStats.totalMinutes / 60)}h`}
          label="Tempo total estudado"
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          value={progressStats.completedMaterials}
          label="Materiais concluídos"
        />
        <StatCard
          icon={<Brain className="size-4" />}
          value={progressStats.reviewedFlashcards}
          label="Flashcards revisados"
        />
        <StatCard
          icon={<ListChecks className="size-4" />}
          value={progressStats.quizzesTaken}
          label="Quizzes realizados"
        />
        <StatCard
          icon={<Target className="size-4" />}
          value={`${progressStats.overallAverage}%`}
          label="Média geral"
        />
        <StatCard
          icon={<Flame className="size-4" />}
          value={`${progressStats.streak} dias`}
          label="Sequência de estudos"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Tempo estudado por semana">
          <BarChart data={weeklyStudyTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="week" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="minutes" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Desempenho nos quizzes">
          <LineChart data={quizPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 100]} {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Materiais concluídos por matéria">
            <BarChart data={materialsCompleted} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" {...axis} />
              <YAxis type="category" dataKey="subject" width={90} {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="total" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </section>
    </>
  );
}
