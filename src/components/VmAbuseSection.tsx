import { PlusIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminAbuseCase } from "../lib/api";
import { CASE_KIND_LABEL, NewCaseModal } from "../pages/AbuseCasesPage";
import { Button } from "./Button";
import { SectionHeading } from "./Facts";
import { PaginatedTable } from "./PaginatedTable";
import { Pill } from "./Pill";

export function VmAbuseSection({ vmId }: { vmId: number }) {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { hasPermission } = useUserRoles();
  const canCreate = hasPermission("abuse::create");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const renderHeader = () => (
    <>
      <th className="w-16">Case</th>
      <th>Kind</th>
      <th>Summary</th>
      <th>Opened</th>
      <th>Status</th>
    </>
  );

  const renderRow = (c: AdminAbuseCase, index: number) => (
    <tr key={c.id || index} className="cursor-pointer" onClick={() => navigate(`/abuse/${c.id}`)}>
      <td className="whitespace-nowrap align-top">
        <Link to={`/abuse/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline">
          #{c.id}
        </Link>
      </td>
      <td className="whitespace-nowrap align-top">
        <Pill variant={c.kind === "illegal_content" ? "danger" : c.kind === "copyright_ca" ? "secondary" : "primary"}>
          {CASE_KIND_LABEL[c.kind]}
        </Pill>
      </td>
      <td className="align-top">
        <div className="max-w-[28rem] truncate text-slate-200" title={c.summary}>
          {c.summary}
        </div>
      </td>
      <td className="whitespace-nowrap align-top text-slate-300">{new Date(c.created).toLocaleString()}</td>
      <td className="whitespace-nowrap align-top">
        {c.closed_at ? <Pill variant="default">Closed</Pill> : <Pill variant="warning">Open</Pill>}
      </td>
    </tr>
  );

  return (
    <div className="space-y-3">
      <SectionHeading
        icon={<ShieldExclamationIcon className="h-4 w-4" />}
        action={
          <>
            <Link to={`/abuse?vm=${vmId}`} className="text-blue-400 hover:underline">
              All cases
            </Link>
            {canCreate && (
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                <PlusIcon className="h-4 w-4" />
                New case
              </Button>
            )}
          </>
        }
      >
        Abuse
      </SectionHeading>

      <PaginatedTable
        apiCall={(params) => adminApi.getAbuseCases({ ...params, vm_id: vmId })}
        calculateStats={(items, total) => {
          const open = items.filter((c) => !c.closed_at).length;
          return (
            <div className="text-sm text-slate-400">
              {total} case{total === 1 ? "" : "s"}
              {open > 0 && <span className="ml-2 text-yellow-300">{open} open on this page</span>}
            </div>
          );
        }}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={() => (
          <div className="py-4 text-center text-sm text-slate-500">No abuse cases for this VM</div>
        )}
        itemsPerPage={10}
        errorAction="load abuse cases"
        loadingMessage="Loading abuse cases..."
        dependencies={[vmId, refreshTrigger]}
        inlineError
        tableClassName="text-sm"
      />

      {showCreate && (
        <NewCaseModal
          initialVmId={vmId}
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
