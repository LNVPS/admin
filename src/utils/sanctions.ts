import type { SanctionsField, SanctionsMatchStatus } from "../lib/api";

export const MATCH_STATUS_LABEL: Record<SanctionsMatchStatus, string> = {
  review: "Review",
  held: "Held",
  cleared: "Cleared",
  confirmed: "Confirmed",
};

export const MATCH_STATUS_VARIANT: Record<SanctionsMatchStatus, "warning" | "danger" | "success" | "default"> = {
  review: "warning",
  held: "danger",
  cleared: "success",
  confirmed: "default",
};

export const FIELD_LABEL: Record<SanctionsField, string> = {
  name: "Name",
  email: "Email",
  entity: "Entity",
  address: "Address",
};

export function isOpenStatus(status: SanctionsMatchStatus): boolean {
  return status === "review" || status === "held";
}

export function formatScore(score: number): string {
  return score.toFixed(2);
}

export function formatMsatAsSats(msat: number | null): string {
  if (msat == null) return "unknown";
  return `${(msat / 1000).toLocaleString()} sats`;
}
