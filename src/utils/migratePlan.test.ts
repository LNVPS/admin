import { describe, expect, it } from "vitest";
import type { AdminMigratePlan } from "../lib/api";
import { canSubmitMigration, formatEstimate, migrationMethodLabel, migrationPhase } from "./migratePlan";

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
