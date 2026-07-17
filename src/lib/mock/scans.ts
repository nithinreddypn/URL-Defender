export type ScanVerdict = "safe" | "suspicious" | "dangerous";

export type Scan = {
  id: string;
  url: string;
  verdict: ScanVerdict;
  risk_score: number;
  scanned_at: string; // ISO
  duration_ms: number;
  engine_flags: number;
  engines_total: number;
};

export function computeStats(scans: Scan[]) {
  const total = scans.length;
  const threats = scans.filter((s) => s.verdict === "dangerous").length;
  const safe = scans.filter((s) => s.verdict === "safe").length;
  const suspicious = scans.filter((s) => s.verdict === "suspicious").length;
  // simple security score: safe ratio scaled 0-100
  const score = total === 0 ? 100 : Math.round((safe / total) * 100);
  return { total, threats, safe, suspicious, score };
}

/**
 * Build 14 daily buckets. Zero-safe.
 */
export function sparkline(scans: Scan[], picker: (s: Scan) => boolean) {
  const days = 14;
  const buckets = Array.from({ length: days }, () => 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMs = today.getTime() - (days - 1) * 86_400_000;
  for (const s of scans) {
    if (!picker(s)) continue;
    const t = new Date(s.scanned_at).getTime();
    const idx = Math.floor((t - startMs) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  }
  return buckets.map((v, i) => ({ i, v }));
}
