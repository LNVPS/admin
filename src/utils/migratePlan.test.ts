import { describe, expect, it, vi } from "vitest";
import type { AdminMigratePlan } from "../lib/api";
import {
  canSubmitMigration,
  formatEstimate,
  migratePlanSupportedByStatus,
  migrationMethodLabel,
  migrationPhase,
  probeMigratePlanSupport,
  shouldRequestPlan,
} from "./migratePlan";

const plan = (over: Partial<AdminMigratePlan> = {}): AdminMigratePlan => ({
  vm_id: 1,
  source_host_id: 1,
  source_host_kind: "proxmox",
  target_host_id: 2,
  target_host_kind: "proxmox",
  method: "hypervisor",
  ip_policy: "keep",
  keep_source: true,
  target_disk_id: null,
  target_storage: null,
  disk_bytes: 1,
  estimated_seconds: 10,
  transfer_timeout_seconds: 900,
  ip_changes: [],
  warnings: [],
  refusals: [],
  ...over,
});

const base = {
  capability: "supported" as const,
  plan: plan(),
  planLoading: false,
  submitting: false,
  targetHostId: "2",
  reassignConfirmed: false,
  ipPolicy: "keep" as const,
};

describe("canSubmitMigration", () => {
  it("allows a clean plan", () => {
    expect(canSubmitMigration(base)).toBe(true);
  });
  it("blocks while refusals exist", () => {
    expect(canSubmitMigration({ ...base, plan: plan({ refusals: ["no"] }) })).toBe(false);
  });
  it("blocks without a plan or while loading", () => {
    expect(canSubmitMigration({ ...base, plan: null })).toBe(false);
    expect(canSubmitMigration({ ...base, planLoading: true })).toBe(false);
  });
  it("needs confirmation for reassign", () => {
    expect(canSubmitMigration({ ...base, ipPolicy: "reassign" })).toBe(false);
    expect(canSubmitMigration({ ...base, ipPolicy: "reassign", reassignConfirmed: true })).toBe(true);
  });
});

describe("capability gate", () => {
  it("never requests a dry run unless the API is known to support it", () => {
    expect(shouldRequestPlan("checking", "2")).toBe(false);
    expect(shouldRequestPlan("unsupported", "2")).toBe(false);
    expect(shouldRequestPlan("supported", "")).toBe(false);
    expect(shouldRequestPlan("supported", "2")).toBe(true);
  });
  it("disables submit on an unsupported or unchecked API", () => {
    expect(canSubmitMigration({ ...base, capability: "unsupported" })).toBe(false);
    expect(canSubmitMigration({ ...base, capability: "checking" })).toBe(false);
  });
  it("only a body validation error marks the new API", () => {
    expect(migratePlanSupportedByStatus(422)).toBe(true);
    expect(migratePlanSupportedByStatus(409)).toBe(false);
    expect(migratePlanSupportedByStatus(200)).toBe(false);
    expect(migratePlanSupportedByStatus(404)).toBe(false);
  });
});

describe("formatters", () => {
  it("formats estimates", () => {
    expect(formatEstimate(30)).toBe("30s");
    expect(formatEstimate(1639)).toBe("27 min");
    expect(formatEstimate(5400)).toBe("1h 30m");
    expect(formatEstimate(7200)).toBe("2h");
  });
  it("labels methods", () => {
    expect(migrationMethodLabel("copy_and_adopt")).toBe("Offline copy and adopt");
    expect(migrationMethodLabel("x")).toBe("x");
  });
  it("reads the phase from metadata", () => {
    expect(migrationPhase({ phase: "copying" })).toBe("copying");
    expect(migrationPhase({ phase: 3 })).toBeNull();
    expect(migrationPhase(null)).toBeNull();
  });
});

describe("probeMigratePlanSupport", () => {
  it("sends a body that cannot start or dry-run a migration", async () => {
    const post = vi.fn().mockResolvedValue({ status: 422 });
    expect(await probeMigratePlanSupport(post)).toBe(true);
    const body = post.mock.calls[0][0];
    expect(body.target_host_id).toBe(0);
    expect(body.ip_policy).toBe("capability_probe");
    expect(body.dry_run).toBeUndefined();
  });
  it("an old API answering 404 for the unknown host is unsupported", async () => {
    expect(await probeMigratePlanSupport(async () => ({ status: 404 }))).toBe(false);
  });
  it("a network failure is unsupported", async () => {
    expect(
      await probeMigratePlanSupport(async () => {
        throw new Error("down");
      }),
    ).toBe(false);
  });
});
