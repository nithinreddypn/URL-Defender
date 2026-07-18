import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { z } from "zod";

// Zod schema with catch() blocks to replicate fallback() logic for alerts search parameters
export const alertsSearchSchema = z.object({
  tab: z.enum(["alerts", "history"]).catch("alerts"),
  q: z.string().catch(""),
  status: z.enum(["all", "safe", "suspicious", "dangerous"]).catch("all"),
  risk: z.enum(["all", "low", "medium", "high", "critical"]).catch("all"),
  from: z.string().catch(""),
  to: z.string().catch(""),
  page: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        return Number.isNaN(parsed) ? 1 : parsed;
      }
      return val;
    }, z.number().int().min(1))
    .catch(1),
});

export type AlertsSearchParams = z.infer<typeof alertsSearchSchema>;

export function useParsedSearch<T>(parser: (params: Record<string, string>) => T): T {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const rawObj = Object.fromEntries(searchParams.entries());
    return parser(rawObj);
  }, [searchParams, parser]);
}

// Hook specifically for the Alerts page search params
export function useAlertsSearch(): AlertsSearchParams {
  return useParsedSearch((raw) => alertsSearchSchema.parse(raw));
}
