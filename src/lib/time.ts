/** "há 5 min", "ontem", "há 3 dias"… from an ISO date. */
export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "nunca";
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return "agora";
  if (min < 60) return `há ${Math.round(min)} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
