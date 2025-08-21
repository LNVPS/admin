import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { AdminVmIpAssignmentInfo, AdminIpRangeInfo } from "../lib/api";
import {
  GlobeAltIcon,
  ArrowLeftIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export function IpAddressDetailsPage() {
  const { ip } = useParams<{ ip: string }>();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ipRange, setIpRange] = useState<AdminIpRangeInfo | null>(null);
  const [currentAssignment, setCurrentAssignment] =
    useState<AdminVmIpAssignmentInfo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AdminVmIpAssignmentInfo | null>(null);

  const decodedIp = ip ? decodeURIComponent(ip) : "";

  const handleEditAssignment = (assignment: AdminVmIpAssignmentInfo) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const refreshData = () => {
    loadIpDetails();
  };

  useEffect(() => {
    if (decodedIp) {
      loadIpDetails();
    }
  }, [decodedIp]);

  const loadIpDetails = async () => {
    if (!decodedIp) return;

    setLoading(true);
    try {
      // Get current assignment and IP range info
      const assignmentsResult = await adminApi.getVmIpAssignments({
        ip: decodedIp,
        limit: 1,
        include_deleted: false,
      });

      if (assignmentsResult.data.length > 0) {
        const assignment = assignmentsResult.data[0];
        setCurrentAssignment(assignment);

        // Get IP range details
        if (assignment.ip_range_id) {
          try {
            const range = await adminApi.getIpRange(assignment.ip_range_id);
            setIpRange(range);
          } catch (err) {
            console.warn("Failed to load IP range details:", err);
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load IP details:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load IP details",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderAssignmentHeader = () => (
    <>
      <th>VM</th>
      <th>Owner</th>
      <th>Status</th>
      <th>DNS</th>
      <th>ARP Ref</th>
      <th>Region</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderAssignmentRow = (
    assignment: AdminVmIpAssignmentInfo,
    index: number,
  ) => (
    <tr key={assignment.id || index}>
      <td>
        <div className="flex items-center space-x-2">
          <ServerIcon className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-white">
              <Link
                to={`/vms/${assignment.vm_id}`}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {`VM-${assignment.vm_id}`}
              </Link>
            </div>
            <div className="text-gray-400 text-xs">ID: {assignment.vm_id}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="text-gray-500">-</span>
      </td>
      <td>
        <div className="flex items-center space-x-2">
          {assignment.deleted ? (
            <XCircleIcon className="h-4 w-4 text-red-400" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
          )}
          <StatusBadge status={assignment.deleted ? "inactive" : "active"} />
        </div>
      </td>
      <td>
        <div className="space-y-0.5">
          {assignment.dns_forward && (
            <div className="text-sm text-blue-400">
              ↗ {assignment.dns_forward}
            </div>
          )}
          {assignment.dns_reverse && (
            <div className="text-sm text-green-400">
              ↙ {assignment.dns_reverse}
            </div>
          )}
          {!assignment.dns_forward && !assignment.dns_reverse && (
            <span className="text-gray-500">None</span>
          )}
        </div>
      </td>
      <td>
        {assignment.arp_ref ? (
          <span className="font-mono text-sm text-gray-300">
            {assignment.arp_ref}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="text-gray-300">{assignment.region_name || "N/A"}</div>
          {assignment.ip_range_cidr && (
            <div className="text-gray-400 text-xs font-mono">
              {assignment.ip_range_cidr}
            </div>
          )}
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          {!assignment.deleted && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleEditAssignment(assignment)}
              className="p-1"
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          )}
          <Link
            to={`/vms/${assignment.vm_id}`}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded"
          >
            <EyeIcon className="h-3 w-3 mr-1" />
            View VM
          </Link>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No assignment history found for this IP address</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-400">Loading IP address details...</div>
      </div>
    );
  }

  if (error && !decodedIp) {
    return (
      <ErrorState
        error={new Error("Invalid IP address")}
        action="load IP address details"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <GlobeAltIcon className="h-6 w-6 mr-2" />
              IP Address Details
            </h1>
            <p className="text-gray-400 font-mono text-lg mt-1">{decodedIp}</p>
          </div>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Current Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Assignment Status</div>
            <div className="flex items-center space-x-2">
              {currentAssignment ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">Assigned</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400 font-medium">Available</span>
                </>
              )}
            </div>
          </div>

          {currentAssignment && (
            <>
              <div>
                <div className="text-gray-400 text-sm mb-1">Current VM</div>
                <Link
                  to={`/vms/${currentAssignment.vm_id}`}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  {`VM-${currentAssignment.vm_id}`}
                </Link>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Region</div>
                <div className="text-white font-medium">
                  {currentAssignment.region_name || "N/A"}
                </div>
              </div>
            </>
          )}

          {ipRange && (
            <div>
              <div className="text-gray-400 text-sm mb-1">IP Range</div>
              <div className="text-white font-mono">{ipRange.cidr}</div>
              <div className="text-gray-400 text-xs mt-1">
                Gateway: {ipRange.gateway}
              </div>
            </div>
          )}
        </div>

        {currentAssignment && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentAssignment.dns_forward && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Forward DNS</div>
                  <div className="text-blue-400 font-mono">
                    {currentAssignment.dns_forward}
                  </div>
                </div>
              )}
              {currentAssignment.dns_reverse && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Reverse DNS</div>
                  <div className="text-green-400 font-mono">
                    {currentAssignment.dns_reverse}
                  </div>
                </div>
              )}
              {currentAssignment.arp_ref && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">
                    ARP Reference
                  </div>
                  <div className="text-gray-300 font-mono">
                    {currentAssignment.arp_ref}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Assignment History
        </h2>
        <PaginatedTable
          apiCall={(params) =>
            adminApi.getVmIpAssignments({
              ...params,
              ip: decodedIp,
              include_deleted: true,
            })
          }
          renderHeader={renderAssignmentHeader}
          renderRow={renderAssignmentRow}
          renderEmptyState={renderEmptyState}
          itemsPerPage={20}
          errorAction="load assignment history"
          loadingMessage="Loading assignment history..."
          dependencies={[decodedIp]}
          calculateStats={(assignments, total) => (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Total assignments:{" "}
                <span className="text-white font-medium">{total}</span>
              </span>
              <span>
                Active:{" "}
                <span className="text-green-400 font-medium">
                  {assignments.filter((a) => !a.deleted).length}
                </span>
              </span>
              <span>
                Historical:{" "}
                <span className="text-gray-400 font-medium">
                  {assignments.filter((a) => a.deleted).length}
                </span>
              </span>
            </div>
          )}
        />
      </div>

      {/* Edit Assignment Modal */}
      {selectedAssignment && (
        <EditIpAssignmentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Edit IP Assignment Modal Component
function EditIpAssignmentModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignment: AdminVmIpAssignmentInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ip: assignment.ip,
    arp_ref: assignment.arp_ref || "",
    dns_forward: assignment.dns_forward || "",
    dns_reverse: assignment.dns_reverse || "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ip: assignment.ip,
        arp_ref: assignment.arp_ref || "",
        dns_forward: assignment.dns_forward || "",
        dns_reverse: assignment.dns_reverse || "",
      });
      setError(null);
    }
  }, [isOpen, assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updates: any = {};

      if (formData.ip !== assignment.ip) {
        updates.ip = formData.ip;
      }
      if (formData.arp_ref !== (assignment.arp_ref || "")) {
        updates.arp_ref = formData.arp_ref || null;
      }
      if (formData.dns_forward !== (assignment.dns_forward || "")) {
        updates.dns_forward = formData.dns_forward || null;
      }
      if (formData.dns_reverse !== (assignment.dns_reverse || "")) {
        updates.dns_reverse = formData.dns_reverse || null;
      }

      if (Object.keys(updates).length > 0) {
        await adminApi.updateVmIpAssignment(assignment.id, updates);
        onSuccess();
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Failed to update IP assignment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update assignment",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit IP Assignment for ${assignment.ip}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">VM:</span>
              <span className="text-white ml-2">VM-{assignment.vm_id}</span>
            </div>
            <div>
              <span className="text-gray-400">IP Range:</span>
              <span className="text-white ml-2 font-mono">
                {assignment.ip_range_cidr}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Region:</span>
              <span className="text-white ml-2">
                {assignment.region_name || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="text-white ml-2">
                {assignment.deleted ? "Deleted" : "Active"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            IP Address *
          </label>
          <input
            type="text"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            className="font-mono"
            required
            placeholder="192.168.1.100"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be within the IP range's CIDR block
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
              placeholder="vm123.example.com"
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
              placeholder="vm123.example.com"
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
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Assignment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
