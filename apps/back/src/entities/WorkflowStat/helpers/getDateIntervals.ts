export function getDateIntervals(params: {
  from: Date;
  to: Date;
  intervalMs: number;
}) {
  const { from, to, intervalMs } = params;

  return Array.from(
    { length: Math.ceil((to.getTime() - from.getTime()) / intervalMs) },
    (_, i) => ({
      from: new Date(from.getTime() + i * intervalMs),
      to: new Date(from.getTime() + (i + 1) * intervalMs - 1),
    })
  );
}
