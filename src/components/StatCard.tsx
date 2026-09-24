import type { ReactNode } from "react";

export function StatCard({
  icon,
  value,
  label,
  hint,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="card-soft flex items-center gap-4 p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-tight">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground/80">{hint}</p> : null}
      </div>
    </div>
  );
}
