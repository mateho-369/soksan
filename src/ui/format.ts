/** 1234 -> "1.2K", 1234567 -> "1.2M" (TikTok-style compact counters). */
export function compactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
