import type { AdminMigratePlan } from "../lib/api";

export function formatEstimate(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function migrationMethodLabel(method: string): string {
  switch (method) {
    case "hypervisor":
      return "Hypervisor migration";
    case "copy_and_adopt":
      return "Offline copy and adopt";
    default:
      return method;
  }
}

export function migrationPhase(metadata: Record<string, unknown> | null | undefined): string | null {
  const phase = metadata?.phase;
  return typeof phase === "string" && phase !== "" ? phase : null;
}

export function canSubmitMigration(opts: {
  plan: AdminMigratePlan | null;
  planLoading: boolean;
  submitting: boolean;
  targetHostId: string;
  reassignConfirmed: boolean;
  ipPolicy: "keep" | "reassign";
}): boolean {
  const { plan, planLoading, submitting, targetHostId, reassignConfirmed, ipPolicy } = opts;
  if (submitting || planLoading || targetHostId === "" || !plan) return false;
  if (plan.refusals.length > 0) return false;
  if (ipPolicy === "reassign" && !reassignConfirmed) return false;
  return true;
}
