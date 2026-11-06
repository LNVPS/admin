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

export type MigrateCapability = "checking" | "supported" | "unsupported";

export function migratePlanSupportedByStatus(status: number): boolean {
  return status === 422;
}

export const MIGRATE_CAPABILITY_PROBE_BODY = { target_host_id: 0, ip_policy: "capability_probe" } as const;

export async function probeMigratePlanSupport(post: (body: object) => Promise<{ status: number }>): Promise<boolean> {
  try {
    const rsp = await post(MIGRATE_CAPABILITY_PROBE_BODY);
    return migratePlanSupportedByStatus(rsp.status);
  } catch {
    return false;
  }
}

export function shouldRequestPlan(capability: MigrateCapability, targetHostId: string): boolean {
  return capability === "supported" && targetHostId !== "";
}

export const MIGRATE_UNSUPPORTED_MESSAGE =
  "This server's admin API does not support migration planning yet. Migration is disabled until the API is updated.";

export function canSubmitMigration(opts: {
  capability: MigrateCapability;
  plan: AdminMigratePlan | null;
  planLoading: boolean;
  submitting: boolean;
  targetHostId: string;
  reassignConfirmed: boolean;
  ipPolicy: "keep" | "reassign";
}): boolean {
  const { capability, plan, planLoading, submitting, targetHostId, reassignConfirmed, ipPolicy } = opts;
  if (capability !== "supported" || submitting || planLoading || targetHostId === "" || !plan) return false;
  if (plan.refusals.length > 0) return false;
  if (ipPolicy === "reassign" && !reassignConfirmed) return false;
  return true;
}
