import { PlusIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { Pill } from "../components/Pill";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AbuseCaseKind, AdminAbuseCase } from "../lib/api";
import { toastService } from "../services/toastService";

export const CASE_KIND_LABEL: Record<AbuseCaseKind, string> = {
  abuse: "Abuse",
  illegal_content: "Illegal content",
  copyright_ca: "Copyright (Canada)",
};

type StateFilter = "open" | "closed" | "all";

export function AbuseCasesPage() {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { hasPermission } = useUserRoles();
  const canCreate = hasPermission("abuse::create");

  const [params] = useSearchParams();
  const [vmId, setVmId] = useState(params.get("vm") ?? "");
  const [userId, setUserId] = useState(params.get("user") ?? "");
  const [state, setState] = useState<StateFilter>(params.has("vm") || params.has("user") ? "all" : "open");
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const parsedVm = vmId.trim() === "" ? undefined : Number(vmId);
  const parsedUser = userId.trim() === "" ? undefined : Number(userId);

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Kind</th>
      <th>Summary</th>
      <th>VM</th>
      <th>Customer</th>
      <th>Reports on VM</th>
      <th>Opened</th>
      <th>Status</th>
    </>
  );

  const renderRow = (c: AdminAbuseCase, index: number) => (
    <tr key={c.id || index} className="cursor-pointer" onClick={() => navigate(`/abuse/${c.id}`)}>
      <td className="whitespace-nowrap align-top text-slate-400">{c.id}</td>
      <td className="align-top whitespace-nowrap">
        <Pill variant={c.kind === "illegal_content" ? "danger" : c.kind === "copyright_ca" ? "secondary" : "primary"}>
          {CASE_KIND_LABEL[c.kind]}
        </Pill>
      </td>
      <td className="align-top">
        <div className="max-w-[24rem] truncate text-slate-200" title={c.summary}>
          {c.summary}
        </div>
      </td>
      <td className="align-top whitespace-nowrap">
        {c.vm_id != null ? (
          <Link to={`/vms/${c.vm_id}`} onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline">
            VM #{c.vm_id}
          </Link>
        ) : (
          <span className="text-slate-500">none</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap">
        {c.user_id != null ? (
          <Link
            to={`/users/${c.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:underline"
          >
            User #{c.user_id}
          </Link>
        ) : (
          <span className="text-slate-500">none</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap">
        {c.report_count_for_service > 1 ? (
          <Pill variant="warning">{c.report_count_for_service} reports</Pill>
        ) : (
          <span className="text-slate-400">{c.report_count_for_service}</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap text-slate-300">{new Date(c.created).toLocaleString()}</td>
      <td className="align-top whitespace-nowrap">
        {c.closed_at ? <Pill variant="default">Closed</Pill> : <Pill variant="success">Open</Pill>}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldExclamationIcon className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Abuse Cases</h1>
            <p className="text-sm text-slate-400">
              Reports about customer services, the decisions taken and any challenges (Terms section 6.1).
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4" />
            New Case
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div>
          <label htmlFor="state" className="mb-1 block text-xs font-medium text-slate-300">
            State
          </label>
          <select id="state" value={state} onChange={(e) => setState(e.target.value as StateFilter)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label htmlFor="vm-id" className="mb-1 block text-xs font-medium text-slate-300">
            VM ID
          </label>
          <input id="vm-id" type="number" value={vmId} onChange={(e) => setVmId(e.target.value)} placeholder="any" />
        </div>
        <div>
          <label htmlFor="user-id" className="mb-1 block text-xs font-medium text-slate-300">
            User ID
          </label>
          <input
            id="user-id"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="any"
          />
        </div>
      </div>

      <PaginatedTable
        apiCall={(params) =>
          adminApi.getAbuseCases({
            ...params,
            vm_id: parsedVm,
            user_id: parsedUser,
            open: state === "all" ? undefined : state === "open",
          })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={() => <div className="py-8 text-center text-slate-400">No abuse cases</div>}
        calculateStats={(_items, total) => <StatsHeader stats={[{ label: "Cases", value: total }]} />}
        dependencies={[state, parsedVm, parsedUser, refreshTrigger]}
        itemsPerPage={20}
        errorAction="load abuse cases"
        loadingMessage="Loading abuse cases..."
      />

      {showCreate && (
        <NewCaseModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setRefreshTrigger((n) => n + 1);
            navigate(`/abuse/${id}`);
          }}
        />
      )}
    </div>
  );
}

function NewCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const adminApi = useAdminApi();
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<AbuseCaseKind>("abuse");
  const [vmId, setVmId] = useState("");
  const [reportedIp, setReportedIp] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [summary, setSummary] = useState("");
  const [proceedings, setProceedings] = useState(false);

  const valid = summary.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const created = await adminApi.createAbuseCase({
        kind,
        vm_id: vmId.trim() === "" ? undefined : Number(vmId),
        reported_ip: reportedIp.trim() === "" ? undefined : reportedIp.trim(),
        incident_at: incidentAt === "" ? undefined : new Date(incidentAt).toISOString(),
        reporter_email: reporterEmail.trim() === "" ? undefined : reporterEmail.trim(),
        summary: summary.trim(),
        proceedings_started: kind === "copyright_ca" ? proceedings : false,
      });
      toastService.success(
        "Case opened",
        reporterEmail.trim() !== "" ? "A receipt was sent to the reporter" : undefined,
      );
      onCreated(created.id);
    } catch (error) {
      console.error("Failed to open case:", error);
      toastService.error("Failed to open case", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Abuse Case" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="kind" className="mb-1 block text-xs font-medium text-white">
            Kind
          </label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as AbuseCaseKind)}>
            {(Object.keys(CASE_KIND_LABEL) as AbuseCaseKind[]).map((k) => (
              <option key={k} value={k}>
                {CASE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="vm-id-2" className="mb-1 block text-xs font-medium text-white">
              VM ID
            </label>
            <input id="vm-id-2" type="number" value={vmId} onChange={(e) => setVmId(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">The customer is taken from the VM.</p>
          </div>
          <div>
            <label htmlFor="reported-ip" className="mb-1 block text-xs font-medium text-white">
              Reported IP
            </label>
            <input id="reported-ip" type="text" value={reportedIp} onChange={(e) => setReportedIp(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="when-it-happened" className="mb-1 block text-xs font-medium text-white">
              When it happened
            </label>
            <input
              id="when-it-happened"
              type="datetime-local"
              value={incidentAt}
              onChange={(e) => setIncidentAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reporter-email" className="mb-1 block text-xs font-medium text-white">
              Reporter email
            </label>
            <input
              id="reporter-email"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Gets a receipt with the case number.</p>
          </div>
        </div>
        <div>
          <label htmlFor="summary" className="mb-1 block text-xs font-medium text-white">
            Summary
          </label>
          <textarea id="summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </div>
        {kind === "copyright_ca" && (
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={proceedings} onChange={(e) => setProceedings(e.target.checked)} />
            Proceedings have started (the record is kept 12 months instead of 6)
          </label>
        )}
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !valid}>
            {saving ? "Opening..." : "Open Case"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
