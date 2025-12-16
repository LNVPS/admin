import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";
import type { AdminVmInfo, AdminIpRangeInfo, AdminVmInfo as VM } from "../lib/api";

interface VmIpAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vm: AdminVmInfo | null;
  onSuccess: () => void;
}

export function VmIpAssignmentModal({
  isOpen,
  onClose,
  vm,
  onSuccess,
}: VmIpAssignmentModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipRanges, setIpRanges] = useState<AdminIpRangeInfo[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [vms, setVms] = useState<VM[]>([]);
  const [formData, setFormData] = useState({
    vm_id: vm?.id.toString() || "",
    ip_range_id: "",
    ip: "",
    arp_ref: "",
    dns_forward: "",
    dns_reverse: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, vm]);

  useEffect(() => {
    // Update form data when VM changes
    setFormData((prev) => ({ ...prev, vm_id: vm?.id.toString() || "" }));
  }, [vm]);

  useEffect(() => {
    // Clear IP range selection when VM changes (since available ranges change)
    setFormData((prev) => ({ ...prev, ip_range_id: "" }));
  }, [formData.vm_id]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        vm_id: vm?.id.toString() || "",
        ip_range_id: "",
        ip: "",
        arp_ref: "",
        dns_forward: "",
        dns_reverse: "",
      });
      setError(null);
    }
  }, [isOpen, vm]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [ipRangesResult, vmsResult] = await Promise.all([
        adminApi.getIpRanges({ limit: 1000, region_id: vm?.region_id }),
        // Only fetch VMs if we don't have a specific VM
        vm ? Promise.resolve({ data: [] }) : adminApi.getVMs({ limit: 1000 }),
      ]);
      setIpRanges(ipRangesResult.data.filter((range) => range.enabled));
      if (!vm) {
        setVms(vmsResult.data.filter((vmItem) => !vmItem.deleted));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetVmId = vm ? vm.id : parseInt(formData.vm_id);
    if (!targetVmId) {
      setError("Please select a VM");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        vm_id: targetVmId,
        ip_range_id: parseInt(formData.ip_range_id),
        ip: formData.ip || null,
        arp_ref: formData.arp_ref || null,
        dns_forward: formData.dns_forward || null,
        dns_reverse: formData.dns_reverse || null,
      };

      await adminApi.createVmIpAssignment(data);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to assign IP:", err);
      setError(err instanceof Error ? err.message : "Failed to assign IP");
    } finally {
      setLoading(false);
    }
  };

  // IP ranges are already filtered by region_id on the server side when vm is provided

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vm ? `Assign IP to VM #${vm.id}` : "Assign IP to VM"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {vm && (
          <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">VM:</span>
                <span className="text-white ml-2">VM-{vm.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Owner:</span>
                <span className="text-white ml-2">
                  {vm.user_pubkey?.substring(0, 16)}...
                </span>
              </div>
              <div>
                <span className="text-gray-400">Template:</span>
                <span className="text-white ml-2">{vm.template_name}</span>
              </div>
              <div>
                <span className="text-gray-400">Region:</span>
                <span className="text-white ml-2">
                  {vm.region_name || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {!vm && (
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              VM *
            </label>
            <select
              value={formData.vm_id}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  vm_id: e.target.value,
                  ip_range_id: "",
                });
              }}
              className=""
              disabled={loadingData}
              required
            >
              <option value="">Select a VM...</option>
              {vms.map((vmItem) => (
                <option key={vmItem.id} value={vmItem.id.toString()}>
                  VM-{vmItem.id} ({vmItem.user_pubkey?.substring(0, 16)}... -{" "}
                  {vmItem.template_name})
                </option>
              ))}
            </select>
            {loadingData && (
              <p className="text-xs text-gray-400 mt-1">Loading VMs...</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            IP Range *
          </label>
          <select
            value={formData.ip_range_id}
            onChange={(e) =>
              setFormData({ ...formData, ip_range_id: e.target.value })
            }
            className=""
            disabled={loadingData}
            required
          >
            <option value="">Select an IP range...</option>
            {ipRanges.map((range) => (
              <option key={range.id} value={range.id.toString()}>
                {range.cidr} - {range.assignment_count} assigned
              </option>
            ))}
          </select>
          {vm && (
            <p className="text-xs text-gray-400 mt-1">
              Only showing IP ranges from {vm.region_name} region for network
              locality
            </p>
          )}
          {loadingData && (
            <p className="text-xs text-gray-400 mt-1">Loading IP ranges...</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Specific IP Address (Optional)
          </label>
          <input
            type="text"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            className="font-mono"
            placeholder="Leave empty for auto-assignment"
          />
          <p className="text-xs text-gray-400 mt-1">
            If left empty, an IP will be automatically assigned from the range
            using the range's allocation mode
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Forward DNS (Optional)
            </label>
            <input
              type="text"
              value={formData.dns_forward}
              onChange={(e) =>
                setFormData({ ...formData, dns_forward: e.target.value })
              }
              className=""
              placeholder={vm ? `vm${vm.id}.example.com` : "vm123.example.com"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Reverse DNS (Optional)
            </label>
            <input
              type="text"
              value={formData.dns_reverse}
              onChange={(e) =>
                setFormData({ ...formData, dns_reverse: e.target.value })
              }
              className=""
              placeholder={vm ? `vm${vm.id}.example.com` : "vm123.example.com"}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            ARP Reference (Optional)
          </label>
          <input
            type="text"
            value={formData.arp_ref}
            onChange={(e) =>
              setFormData({ ...formData, arp_ref: e.target.value })
            }
            className=""
            placeholder="External ARP reference ID"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || loadingData}>
            {loading ? "Assigning..." : "Assign IP"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
