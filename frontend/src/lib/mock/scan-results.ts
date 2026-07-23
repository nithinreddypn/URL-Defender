import type { ScanVerdict } from "@/lib/mock/scans";

export type SslStatus = "valid" | "expired" | "self-signed" | "invalid";

export type EngineResult = {
  name: string;
  flagged: boolean;
  label: string;
};

export type ScanResult = {
  id: string;
  url: string;
  hostname: string;
  verdict: ScanVerdict;
  risk_score: number;
  threat_category: string;
  ssl: {
    status: SslStatus;
    issuer: string;
    expires_at: string;
    valid_from: string;
  };
  domain_age_days: number;
  blacklist: {
    listed_on: number;
    total_lists: number;
    sources: string[];
  };
  engines: EngineResult[];
  ip_address: string;
  redirect_chain: string[];
  headers: Record<string, string>;
  timeline: {
    submitted_at: string;
    analyzed_at: string;
    completed_at: string;
  };
  recommendations: string[];
  scanned_at: string;
  duration_ms: number;
};
