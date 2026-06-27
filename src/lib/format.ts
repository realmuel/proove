/* Compact duration formatting.
   25  -> "25m"
   60  -> "1h"
   95  -> "1h 35m"
*/
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || isNaN(minutes)) return "";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
