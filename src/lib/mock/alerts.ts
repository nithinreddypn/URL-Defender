export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertType = "phishing" | "malware" | "impersonation" | "blacklist" | "ssl";

export type Alert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  url: string;
  created_at: string;
};
