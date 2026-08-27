import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminCustomPricingInfo, AdminCustomTemplateInfo, UpdateCustomTemplateRequest } from "../lib/api";
import { DiskInterface, DiskType } from "../lib/api";
import { toastService } from "../services/toastService";
import { formatCurrency } from "../utils/currency";
import { Button } from "./Button";
import { Modal } from "./Modal";

const GIB = 1024 * 1024 * 1024;

interface EditCustomTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `AdminVmInfo.custom_template_id` — the spec this VM owns. */
  templateId: number;
  vmId: number;
  /** Called once the patch succeeds, so the caller can reload the VM. */
  onUpdated: () => void;
}

interface FormState {
  cpu: string;
  memory_gib: string;
  disk_gib: string;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  pricing_id: string;
  ip4_count: string;
  ip6_count: string;
  disk_iops_read: string;
  disk_iops_write: string;
  disk_mbps_read: string;
  disk_mbps_write: string;
  network_mbps: string;
  cpu_limit: string;
  firewall_rule_limit: string;
  transfer_gb: string;
}

/** Blank input means "no cap"; the API takes `null` for that. */
function capValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function capString(value: number | null): string {
  return value === null ? "" : String(value);
}

function toForm(template: AdminCustomTemplateInfo): FormState {
  return {
    cpu: String(template.cpu),
    memory_gib: String(Math.round(template.memory / GIB)),
    disk_gib: String(Math.round(template.disk_size / GIB)),
    disk_type: template.disk_type,
    disk_interface: template.disk_interface,
    pricing_id: String(template.pricing_id),
    ip4_count: String(template.ip4_count),
    ip6_count: String(template.ip6_count),
    disk_iops_read: capString(template.disk_iops_read),
    disk_iops_write: capString(template.disk_iops_write),
    disk_mbps_read: capString(template.disk_mbps_read),
    disk_mbps_write: capString(template.disk_mbps_write),
    network_mbps: capString(template.network_mbps),
    cpu_limit: capString(template.cpu_limit),
    firewall_rule_limit: capString(template.firewall_rule_limit),
    transfer_gb: capString(template.transfer_gb),
  };
}

/** The spec the form currently describes, in the API's units. */
function toSpec(form: FormState) {
  return {
    cpu: Number.parseInt(form.cpu, 10) || 0,
    memory: (Number.parseInt(form.memory_gib, 10) || 0) * GIB,
    disk_size: (Number.parseInt(form.disk_gib, 10) || 0) * GIB,
    disk_type: form.disk_type,
    disk_interface: form.disk_interface,
    pricing_id: Number.parseInt(form.pricing_id, 10) || 0,
    ip4_count: Number.parseInt(form.ip4_count, 10) || 0,
    ip6_count: Number.parseInt(form.ip6_count, 10) || 0,
    disk_iops_read: capValue(form.disk_iops_read),
    disk_iops_write: capValue(form.disk_iops_write),
    disk_mbps_read: capValue(form.disk_mbps_read),
    disk_mbps_write: capValue(form.disk_mbps_write),
    network_mbps: capValue(form.network_mbps),
    cpu_limit: capValue(form.cpu_limit),
    firewall_rule_limit: capValue(form.firewall_rule_limit),
    transfer_gb: capValue(form.transfer_gb),
  };
}

/**
 * Only send what moved.
 *
 * A full-body PATCH would re-send every cap on every save, which turns an
 * unrelated concurrent change into a silent revert.
 */
function buildPatch(template: AdminCustomTemplateInfo, form: FormState): UpdateCustomTemplateRequest {
  const spec = toSpec(form);
  const patch: UpdateCustomTemplateRequest = {};

  if (spec.cpu !== template.cpu) patch.cpu = spec.cpu;
  if (spec.memory !== template.memory) patch.memory = spec.memory;
  if (spec.disk_size !== template.disk_size) patch.disk_size = spec.disk_size;
  if (spec.disk_type !== template.disk_type) patch.disk_type = spec.disk_type;
  if (spec.disk_interface !== template.disk_interface) patch.disk_interface = spec.disk_interface;
  if (spec.pricing_id !== template.pricing_id) patch.pricing_id = spec.pricing_id;
  if (spec.ip4_count !== template.ip4_count) patch.ip4_count = spec.ip4_count;
  if (spec.ip6_count !== template.ip6_count) patch.ip6_count = spec.ip6_count;
  if (spec.disk_iops_read !== template.disk_iops_read) patch.disk_iops_read = spec.disk_iops_read;
  if (spec.disk_iops_write !== template.disk_iops_write) patch.disk_iops_write = spec.disk_iops_write;
  if (spec.disk_mbps_read !== template.disk_mbps_read) patch.disk_mbps_read = spec.disk_mbps_read;
  if (spec.disk_mbps_write !== template.disk_mbps_write) patch.disk_mbps_write = spec.disk_mbps_write;
  if (spec.network_mbps !== template.network_mbps) patch.network_mbps = spec.network_mbps;
  if (spec.cpu_limit !== template.cpu_limit) patch.cpu_limit = spec.cpu_limit;
  if (spec.firewall_rule_limit !== template.firewall_rule_limit) patch.firewall_rule_limit = spec.firewall_rule_limit;
  if (spec.transfer_gb !== template.transfer_gb) patch.transfer_gb = spec.transfer_gb;

  return patch;
}

/**
 * Price the form's spec against a plan, mirroring the server's pricing engine
 * (GB counts rounded **up**, disk priced by matching kind *and* interface).
 *
 * Returns null when the plan cannot price this spec at all — which is exactly
 * what the server rejects with a 400, so it is worth showing before saving.
 */
function priceSpec(form: FormState, pricing: AdminCustomPricingInfo | undefined): number | null {
  if (!pricing) return null;
  const spec = toSpec(form);
  const disk = pricing.disk_pricing.find((d) => d.kind === spec.disk_type && d.interface === spec.disk_interface);
  if (!disk) return null;

  return (
    pricing.cpu_cost * spec.cpu +
    pricing.memory_cost * Math.ceil(spec.memory / GIB) +
    disk.cost * Math.ceil(spec.disk_size / GIB) +
    pricing.ip4_cost * spec.ip4_count +
    pricing.ip6_cost * spec.ip6_count
  );
}

/**
 * Everything the server refuses, checked here so the admin sees it while
 * typing rather than as a 400 after committing to a save.
 */
function validate(form: FormState, template: AdminCustomTemplateInfo, pricing?: AdminCustomPricingInfo): string[] {
  const spec = toSpec(form);
  const problems: string[] = [];

  if (spec.cpu < 1) problems.push("CPU must be at least 1 core.");
  // Downgrades are refused by the API: shrinking a virtual disk destroys the
  // filesystem on the removed blocks, and CPU/memory follow the same rule.
  if (spec.cpu < template.cpu) problems.push(`CPU cannot go below the current ${template.cpu} cores.`);
  if (spec.memory < template.memory)
    problems.push(`Memory cannot go below the current ${Math.round(template.memory / GIB)} GB.`);
  if (spec.disk_size < template.disk_size)
    problems.push(`Disk cannot go below the current ${Math.round(template.disk_size / GIB)} GB.`);

  if (pricing) {
    const disk = pricing.disk_pricing.find((d) => d.kind === spec.disk_type && d.interface === spec.disk_interface);
    if (!disk) {
      problems.push(`${pricing.name} does not price ${spec.disk_type.toUpperCase()} on ${spec.disk_interface}.`);
    } else if (spec.disk_size < disk.min_disk_size || spec.disk_size > disk.max_disk_size) {
      problems.push(
        `Disk must be ${Math.round(disk.min_disk_size / GIB)}–${Math.round(disk.max_disk_size / GIB)} GB on this plan.`,
      );
    }
    if (spec.cpu < pricing.min_cpu || spec.cpu > pricing.max_cpu)
      problems.push(`CPU must be ${pricing.min_cpu}–${pricing.max_cpu} cores on this plan.`);
    if (spec.memory < pricing.min_memory || spec.memory > pricing.max_memory)
      problems.push(
        `Memory must be ${Math.round(pricing.min_memory / GIB)}–${Math.round(pricing.max_memory / GIB)} GB on this plan.`,
      );
    if (spec.ip4_count < pricing.min_ip4 || spec.ip4_count > pricing.max_ip4)
      problems.push(`IPv4 count must be ${pricing.min_ip4}–${pricing.max_ip4} on this plan.`);
    if (spec.ip6_count < pricing.min_ip6 || spec.ip6_count > pricing.max_ip6)
      problems.push(`IPv6 count must be ${pricing.min_ip6}–${pricing.max_ip6} on this plan.`);
  }

  return problems;
}

/** Which resources grew, and therefore what the save will do to the VM. */
function resizeImpact(form: FormState, template: AdminCustomTemplateInfo): string | null {
  const spec = toSpec(form);
  const grown = [
    spec.cpu !== template.cpu && "CPU",
    spec.memory !== template.memory && "memory",
    spec.disk_size !== template.disk_size && "disk",
  ].filter(Boolean);
  if (grown.length > 0) {
    return `Changing ${grown.join(", ")} restarts the VM: it is stopped, the disk is resized, the VM is reconfigured and started again.`;
  }

  const reconfigure =
    spec.disk_type !== template.disk_type ||
    spec.disk_interface !== template.disk_interface ||
    spec.disk_iops_read !== template.disk_iops_read ||
    spec.disk_iops_write !== template.disk_iops_write ||
    spec.disk_mbps_read !== template.disk_mbps_read ||
    spec.disk_mbps_write !== template.disk_mbps_write ||
    spec.network_mbps !== template.network_mbps ||
    spec.cpu_limit !== template.cpu_limit;
  if (reconfigure) return "The VM is reconfigured on its host without restarting.";

  return null;
}

/**
 * Edit the spec of a VM that runs on a custom template.
 *
 * The row being edited is the VM's hardware *and* its price, so the price
 * change is shown before saving: the API rewrites the subscription line item as
 * part of the same request.
 */
export function EditCustomTemplateModal({
  isOpen,
  onClose,
  templateId,
  vmId,
  onUpdated,
}: EditCustomTemplateModalProps) {
  const adminApi = useAdminApi();
  const [template, setTemplate] = useState<AdminCustomTemplateInfo | null>(null);
  const [plans, setPlans] = useState<AdminCustomPricingInfo[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setLoading(true);
    setTemplate(null);
    setForm(null);

    adminApi
      .getCustomTemplate(templateId)
      .then(async (loaded) => {
        setTemplate(loaded);
        setForm(toForm(loaded));
        // Plans in the same region only: moving a VM to a plan in another
        // region would price it for hardware it is not running on.
        const available = await adminApi.getCustomPricing({ limit: 100, offset: 0, region_id: loaded.region_id });
        setPlans(available.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the custom template"))
      .finally(() => setLoading(false));
  }, [isOpen, templateId, adminApi]);

  const selectedPlan = useMemo(() => plans.find((p) => String(p.id) === form?.pricing_id), [plans, form?.pricing_id]);
  const problems = useMemo(
    () => (form && template ? validate(form, template, selectedPlan) : []),
    [form, template, selectedPlan],
  );
  const newPrice = useMemo(() => (form ? priceSpec(form, selectedPlan) : null), [form, selectedPlan]);
  const impact = useMemo(() => (form && template ? resizeImpact(form, template) : null), [form, template]);
  const patch = useMemo(() => (form && template ? buildPatch(template, form) : {}), [form, template]);
  const hasChanges = Object.keys(patch).length > 0;

  const set = (key: keyof FormState, value: string) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!template || !form || !hasChanges || problems.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.updateCustomTemplate(template.id, patch);
      toastService.success(
        "Spec updated",
        result.job_ids.length > 0
          ? `Renewal is now ${formatCurrency(result.renewal_amount, result.template.currency)}/mo. ${result.job_ids.length} host job(s) queued.`
          : `Renewal is now ${formatCurrency(result.renewal_amount, result.template.currency)}/mo. No host changes were needed.`,
      );
      onClose();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the custom template");
    } finally {
      setSaving(false);
    }
  };

  const numberField = (label: string, key: keyof FormState, hint?: string, min?: number) => (
    <div>
      <label htmlFor={`ct-${key}`} className="block text-xs font-medium text-white mb-1">
        {label}
      </label>
      <input
        id={`ct-${key}`}
        type="number"
        min={min}
        value={form?.[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        className="w-full"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit spec — VM #${vmId}`} size="3xl">
      {loading && <div className="py-8 text-center text-sm text-gray-400">Loading spec...</div>}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}

      {template && form && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            This spec belongs to this VM alone. Saving also rewrites the subscription so the next renewal bills for it.
            CPU, memory and disk can only grow — to give a customer less, delete and re-create the VM.
          </p>

          {template.vm_ids.length > 1 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Shared spec: {template.vm_ids.length} VMs (#{template.vm_ids.join(", #")}) use it. All of them are
                repriced and reconfigured.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {numberField("CPU cores", "cpu", `Currently ${template.cpu}`, template.cpu)}
            {numberField(
              "Memory (GB)",
              "memory_gib",
              `Currently ${Math.round(template.memory / GIB)}`,
              Math.round(template.memory / GIB),
            )}
            {numberField(
              "Disk (GB)",
              "disk_gib",
              `Currently ${Math.round(template.disk_size / GIB)}`,
              Math.round(template.disk_size / GIB),
            )}
            {numberField("IPv4", "ip4_count", "Billed even before assignment", 0)}
            {numberField("IPv6", "ip6_count", undefined, 0)}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="ct-disk-type" className="block text-xs font-medium text-white mb-1">
                Disk type
              </label>
              <select id="ct-disk-type" value={form.disk_type} onChange={(e) => set("disk_type", e.target.value)}>
                <option value={DiskType.SSD}>SSD</option>
                <option value={DiskType.HDD}>HDD</option>
              </select>
            </div>
            <div>
              <label htmlFor="ct-disk-interface" className="block text-xs font-medium text-white mb-1">
                Disk interface
              </label>
              <select
                id="ct-disk-interface"
                value={form.disk_interface}
                onChange={(e) => set("disk_interface", e.target.value)}
              >
                <option value={DiskInterface.PCIE}>PCIe</option>
                <option value={DiskInterface.SCSI}>SCSI</option>
                <option value={DiskInterface.SATA}>SATA</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="ct-pricing" className="block text-xs font-medium text-white mb-1">
                Pricing plan
              </label>
              <select id="ct-pricing" value={form.pricing_id} onChange={(e) => set("pricing_id", e.target.value)}>
                {plans.length === 0 && <option value={form.pricing_id}>{template.pricing_name}</option>}
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.currency}){plan.enabled ? "" : " — disabled"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">{template.region_name ?? `Region #${template.region_id}`}</p>
            </div>
          </div>

          <details className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">
              Limits — blank means uncapped
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {numberField("Disk read IOPS", "disk_iops_read", undefined, 0)}
              {numberField("Disk write IOPS", "disk_iops_write", undefined, 0)}
              {numberField("Disk read MB/s", "disk_mbps_read", undefined, 0)}
              {numberField("Disk write MB/s", "disk_mbps_write", undefined, 0)}
              {numberField("Network Mbit/s", "network_mbps", undefined, 0)}
              {numberField("CPU limit", "cpu_limit", "Fraction of allocated cores, e.g. 0.5 = 50%", 0)}
              {numberField("Firewall rules", "firewall_rule_limit", "Blank uses the global default", 0)}
              {numberField("Transfer (GB/mo)", "transfer_gb", "Outbound; blank is unmetered", 0)}
            </div>
          </details>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Monthly renewal</span>
              <span className="text-white">
                {formatCurrency(template.price, template.currency)}
                {newPrice !== null && newPrice !== template.price && (
                  <>
                    <span className="text-slate-600"> → </span>
                    <span className={newPrice > template.price ? "text-green-400" : "text-yellow-400"}>
                      {formatCurrency(newPrice, selectedPlan?.currency ?? template.currency)}
                    </span>
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Estimated here from the plan's rates; the API's own calculation is what gets written to the subscription.
            </p>
          </div>

          {impact && <div className="text-xs text-yellow-500/90">{impact}</div>}

          {problems.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges || problems.length > 0}>
              {saving ? "Saving..." : "Save spec"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
