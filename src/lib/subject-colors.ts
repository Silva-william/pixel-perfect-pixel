import type { SubjectColor } from "@/data/types";

/** Literal class strings so Tailwind keeps them at build time. */
export const subjectSwatch: Record<SubjectColor, string> = {
  green: "bg-chart-1",
  blue: "bg-chart-2",
  amber: "bg-chart-3",
  violet: "bg-chart-4",
  rose: "bg-chart-5",
  slate: "bg-muted-foreground",
};

export const subjectSoft: Record<SubjectColor, string> = {
  green: "bg-chart-1/10 text-chart-1",
  blue: "bg-chart-2/10 text-chart-2",
  amber: "bg-chart-3/15 text-chart-3",
  violet: "bg-chart-4/10 text-chart-4",
  rose: "bg-chart-5/10 text-chart-5",
  slate: "bg-muted text-muted-foreground",
};

export const subjectColorOptions: { value: SubjectColor; label: string }[] = [
  { value: "green", label: "Verde" },
  { value: "blue", label: "Azul" },
  { value: "amber", label: "Âmbar" },
  { value: "violet", label: "Violeta" },
  { value: "rose", label: "Rosa" },
  { value: "slate", label: "Neutro" },
];
