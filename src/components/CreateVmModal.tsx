import {
  CommandLineIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  KeyIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type {
  AdminCreateCustomVmRequest,
  AdminCustomPricingInfo,
  AdminSshKeyInfo,
  AdminUserInfo,
  AdminVmOsImageInfo,
  AdminVmTemplateInfo,
} from "../lib/api";
import { DiskInterface, DiskType } from "../lib/api";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface CreateVmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
  preselectedUser?: AdminUserInfo;
}

/** Which endpoint the modal submits to: a fixed template, or an arbitrary spec. */
type CreateMode = "template" | "custom";

const GIB = 1024 * 1024 * 1024;

interface FormData {
  user_id: string;
  template_id: string;
  image_id: string;
  ssh_key_id: string;
  ref_code: string;
  reason: string;
  // Custom-spec fields
  pricing_id: string;
  cpu: string;
  memory_gib: string;
  disk_gib: string;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cpu_mfg: string;
  cpu_arch: string;
  cpu_feature: string;
  ip4_count: string;
  ip6_count: string;
}

const emptyForm = (preselectedUser?: AdminUserInfo): FormData => ({
  user_id: preselectedUser?.id.toString() || "",
  template_id: "",
  image_id: "",
  ssh_key_id: "",
  ref_code: "",
  reason: "",
  pricing_id: "",
  cpu: "2",
  memory_gib: "4",
  disk_gib: "40",
  disk_type: DiskType.SSD,
  disk_interface: DiskInterface.SCSI,
  cpu_mfg: "",
  cpu_arch: "",
  cpu_feature: "",
  ip4_count: "1",
  ip6_count: "1",
});

const inputClass =
  "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500";

export function CreateVmModal({ isOpen, onClose, onSuccess, preselectedUser }: CreateVmModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [mode, setMode] = useState<CreateMode>("template");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data arrays
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [templates, setTemplates] = useState<AdminVmTemplateInfo[]>([]);
  const [images, setImages] = useState<AdminVmOsImageInfo[]>([]);
  const [sshKeys, setSshKeys] = useState<AdminSshKeyInfo[]>([]);
  const [pricingPlans, setPricingPlans] = useState<AdminCustomPricingInfo[]>([]);

  const [formData, setFormData] = useState<FormData>(() => emptyForm(preselectedUser));

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setFormData(emptyForm(preselectedUser));
      setMode("template");
      setShowAdvanced(false);
      setError(null);
    }
  }, [isOpen, preselectedUser]);

  useEffect(() => {
    // Load SSH keys when user changes
    if (formData.user_id) {
      loadSshKeys(parseInt(formData.user_id, 10));
    } else {
      setSshKeys([]);
      setFormData((prev) => ({ ...prev, ssh_key_id: "" }));
    }
  }, [formData.user_id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      const [usersResponse, templatesResponse, imagesResponse, pricingResponse] = await Promise.all([
        adminApi.getUsers({ limit: 1000 }),
        adminApi.getVmTemplates({ limit: 1000 }),
        adminApi.getVmOsImages({ limit: 1000 }),
        adminApi.getCustomPricing({ limit: 1000, enabled: true }),
      ]);

      setUsers(usersResponse.data);
      setTemplates(templatesResponse.data.filter((t) => t.enabled));
      setImages(imagesResponse.data.filter((i) => i.enabled));
      setPricingPlans(pricingResponse.data.filter((p) => p.enabled));
    } catch (err) {
      console.error("Failed to load VM creation data:", err);
      setError(err instanceof Error ? err.message : "Failed to load required data");
    } finally {
      setLoadingData(false);
    }
  };

  const loadSshKeys = async (userId: number) => {
    try {
      const keys = await adminApi.getUserSshKeys(userId);
      setSshKeys(keys);
    } catch (err) {
      // The admin router does not expose an SSH-key listing endpoint yet, so a
      // failure here is expected — the form falls back to a manual id input.
      console.error("Failed to load SSH keys:", err);
      setSshKeys([]);
    }
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  /** Parse a required positive integer field, returning null when invalid. */
  const positiveInt = (value: string): number | null => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.image_id || !formData.ssh_key_id) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = mode === "template" ? await submitTemplate() : await submitCustom();
      if (!result) return;

      onSuccess(result.job_id);
      onClose();
    } catch (err) {
      console.error("Failed to create VM:", err);
      setError(err instanceof Error ? err.message : "Failed to create VM");
    } finally {
      setLoading(false);
    }
  };

  const submitTemplate = async () => {
    if (!formData.template_id) {
      setError("Please select a VM template");
      return null;
    }

    return await adminApi.createVM({
      user_id: parseInt(formData.user_id, 10),
      template_id: parseInt(formData.template_id, 10),
      image_id: parseInt(formData.image_id, 10),
      ssh_key_id: parseInt(formData.ssh_key_id, 10),
      ...(formData.ref_code.trim() && { ref_code: formData.ref_code.trim() }),
      ...(formData.reason.trim() && { reason: formData.reason.trim() }),
    });
  };

  const submitCustom = async () => {
    const pricingId = positiveInt(formData.pricing_id);
    const cpu = positiveInt(formData.cpu);
    const memoryGib = positiveInt(formData.memory_gib);
    const diskGib = positiveInt(formData.disk_gib);

    if (!pricingId) {
      setError("Please select a custom pricing plan");
      return null;
    }
    if (!cpu || !memoryGib || !diskGib) {
      setError("vCPU, memory and disk must all be positive numbers");
      return null;
    }

    const ip4Count = Number.parseInt(formData.ip4_count, 10);
    const ip6Count = Number.parseInt(formData.ip6_count, 10);
    const features = formData.cpu_feature
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const payload: AdminCreateCustomVmRequest = {
      user_id: parseInt(formData.user_id, 10),
      pricing_id: pricingId,
      cpu,
      memory: memoryGib * GIB,
      disk: diskGib * GIB,
      disk_type: formData.disk_type,
      disk_interface: formData.disk_interface,
      image_id: parseInt(formData.image_id, 10),
      ssh_key_id: parseInt(formData.ssh_key_id, 10),
      // Optional spec fields are omitted rather than sent empty: the server
      // treats an absent cpu_mfg/cpu_arch/cpu_feature as "any".
      ...(formData.cpu_mfg.trim() && { cpu_mfg: formData.cpu_mfg.trim() }),
      ...(formData.cpu_arch.trim() && { cpu_arch: formData.cpu_arch.trim() }),
      ...(features.length > 0 && { cpu_feature: features }),
      ...(Number.isFinite(ip4Count) && { ip4_count: ip4Count }),
      ...(Number.isFinite(ip6Count) && { ip6_count: ip6Count }),
      ...(formData.ref_code.trim() && { ref_code: formData.ref_code.trim() }),
      ...(formData.reason.trim() && { reason: formData.reason.trim() }),
    };

    return await adminApi.createCustomVM(payload);
  };

  const selectedUser = users.find((u) => u.id.toString() === formData.user_id);
  const selectedTemplate = templates.find((t) => t.id.toString() === formData.template_id);
  const selectedImage = images.find((i) => i.id.toString() === formData.image_id);
  const selectedPricing = pricingPlans.find((p) => p.id.toString() === formData.pricing_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create VM for User"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading} disabled={loadingData}>
            {mode === "template" ? "Create VM" : "Create Custom VM"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="inline-flex rounded-lg border border-gray-600 bg-gray-800 p-1">
          {(["template", "custom"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={clsx(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                mode === value ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white",
              )}
            >
              {value === "template" ? "Template" : "Custom spec"}
            </button>
          ))}
        </div>

        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-medium">Admin VM Creation</h4>
              <p className="text-blue-300/80 text-sm mt-1">
                {mode === "template"
                  ? "This will create a VM for the specified user from a fixed template."
                  : "This will create a VM from an arbitrary spec, billed against the selected custom pricing plan (which also decides the region and currency). Spec limits, image architecture and host capacity are only checked when the job runs."}{" "}
                VM creation is asynchronous and you will receive real-time updates via notifications.
              </p>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading VM creation data...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Target User *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setField("user_id", e.target.value)}
                className={inputClass}
                required
                disabled={!!preselectedUser}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email || user.pubkey.slice(0, 16)}... (ID: {user.id})
                  </option>
                ))}
              </select>
              {selectedUser && (
                <div className="text-sm text-gray-400 mt-1">Pubkey: {selectedUser.pubkey.slice(0, 32)}...</div>
              )}
            </div>

            {mode === "template" ? (
              /* Template Selection */
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <ComputerDesktopIcon className="h-4 w-4 inline mr-2" />
                  VM Template *
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => setField("template_id", e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.cpu}C • {Math.round(template.memory / GIB)}GB •{" "}
                      {Math.round(template.disk_size / GIB)}GB)
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="text-sm text-gray-400 mt-1">Region: {selectedTemplate.region_name || "Unknown"}</div>
                )}
              </div>
            ) : (
              <>
                {/* Custom pricing plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <CurrencyDollarIcon className="h-4 w-4 inline mr-2" />
                    Custom Pricing Plan *
                  </label>
                  <select
                    value={formData.pricing_id}
                    onChange={(e) => setField("pricing_id", e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select a pricing plan...</option>
                    {pricingPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.region_name || `region #${plan.region_id}`} • {plan.currency})
                      </option>
                    ))}
                  </select>
                  {pricingPlans.length === 0 && (
                    <div className="text-sm text-yellow-400 mt-1">No enabled custom pricing plans available</div>
                  )}
                  {selectedPricing && (
                    <div className="text-sm text-gray-400 mt-1">
                      CPU {selectedPricing.min_cpu}–{selectedPricing.max_cpu} cores • Memory{" "}
                      {Math.round(selectedPricing.min_memory / GIB)}–{Math.round(selectedPricing.max_memory / GIB)} GiB
                      {" • "}IPv4 {selectedPricing.min_ip4 ?? 1}–{selectedPricing.max_ip4 ?? 1} • IPv6{" "}
                      {selectedPricing.min_ip6 ?? 1}–{selectedPricing.max_ip6 ?? 1}
                    </div>
                  )}
                </div>

                {/* Spec */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">vCPU Cores *</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.cpu}
                      onChange={(e) => setField("cpu", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Memory (GiB) *</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.memory_gib}
                      onChange={(e) => setField("memory_gib", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Disk Size (GiB) *</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.disk_gib}
                      onChange={(e) => setField("disk_gib", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Disk Type *</label>
                      <select
                        value={formData.disk_type}
                        onChange={(e) => setField("disk_type", e.target.value as DiskType)}
                        className={inputClass}
                      >
                        {Object.values(DiskType).map((value) => (
                          <option key={value} value={value}>
                            {value.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Interface *</label>
                      <select
                        value={formData.disk_interface}
                        onChange={(e) => setField("disk_interface", e.target.value as DiskInterface)}
                        className={inputClass}
                      >
                        {Object.values(DiskInterface).map((value) => (
                          <option key={value} value={value}>
                            {value.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* IP counts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">IPv4 Addresses</label>
                    <input
                      type="number"
                      min={selectedPricing?.min_ip4 ?? 0}
                      max={selectedPricing?.max_ip4}
                      value={formData.ip4_count}
                      onChange={(e) => setField("ip4_count", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">IPv6 Addresses</label>
                    <input
                      type="number"
                      min={selectedPricing?.min_ip6 ?? 0}
                      max={selectedPricing?.max_ip6}
                      value={formData.ip6_count}
                      onChange={(e) => setField("ip6_count", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Advanced CPU constraints */}
                <div className="border border-gray-700 rounded-md">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:text-white"
                  >
                    {showAdvanced ? "▾" : "▸"} Advanced CPU constraints (optional)
                  </button>
                  {showAdvanced && (
                    <div className="px-3 pb-3 space-y-3">
                      <p className="text-xs text-gray-500">
                        Leave blank for "any". Unknown values are rejected by the server, and misspelled field names are
                        silently ignored.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">CPU Manufacturer</label>
                          <input
                            type="text"
                            value={formData.cpu_mfg}
                            onChange={(e) => setField("cpu_mfg", e.target.value)}
                            placeholder="intel / amd"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">CPU Architecture</label>
                          <input
                            type="text"
                            value={formData.cpu_arch}
                            onChange={(e) => setField("cpu_arch", e.target.value)}
                            placeholder="x86_64 / arm64"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Required CPU Features (comma separated)
                        </label>
                        <input
                          type="text"
                          value={formData.cpu_feature}
                          onChange={(e) => setField("cpu_feature", e.target.value)}
                          placeholder="AVX2, AES"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* OS Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <CommandLineIcon className="h-4 w-4 inline mr-2" />
                OS Image *
              </label>
              <select
                value={formData.image_id}
                onChange={(e) => setField("image_id", e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select an OS image...</option>
                {images.map((image) => (
                  <option key={image.id} value={image.id}>
                    {image.distribution} {image.flavour} {image.version}
                  </option>
                ))}
              </select>
              {selectedImage && (
                <div className="text-sm text-gray-400 mt-1">
                  Default user: {selectedImage.default_username || "root"}
                </div>
              )}
            </div>

            {/* SSH Key Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <KeyIcon className="h-4 w-4 inline mr-2" />
                SSH Key *
              </label>
              {!formData.user_id ? (
                <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400">
                  Select a user first to load their SSH keys
                </div>
              ) : sshKeys.length > 0 ? (
                <select
                  value={formData.ssh_key_id}
                  onChange={(e) => setField("ssh_key_id", e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select an SSH key...</option>
                  {sshKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.fingerprint})
                    </option>
                  ))}
                </select>
              ) : (
                /* The admin API exposes no SSH-key listing route, so fall back
                   to entering the id by hand rather than blocking creation. */
                <>
                  <input
                    type="number"
                    min={1}
                    value={formData.ssh_key_id}
                    onChange={(e) => setField("ssh_key_id", e.target.value)}
                    placeholder="Enter SSH key ID"
                    className={inputClass}
                    required
                  />
                  <div className="text-sm text-yellow-400 mt-1">
                    Could not list this user's SSH keys — enter the key ID manually. It must belong to the selected
                    user.
                  </div>
                </>
              )}
            </div>

            {/* Referral Code (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Referral Code (Optional)</label>
              <input
                type="text"
                value={formData.ref_code}
                onChange={(e) => setField("ref_code", e.target.value)}
                placeholder="Enter referral code if applicable"
                className={inputClass}
              />
            </div>

            {/* Reason (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Reason (Optional)</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setField("reason", e.target.value)}
                placeholder="Enter reason for creating this VM (for audit trail)"
                rows={2}
                className={inputClass}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
