import { PlusIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminAbuseCase } from "../lib/api";
import { CASE_KIND_LABEL } from "../pages/AbuseCasesPage";
import { Button } from "./Button";
import { SectionHeading } from "./Facts";
import { PaginatedTable } from "./PaginatedTable";
import { Pill } from "./Pill";

export function UserAbuseSection({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { hasPermission } = useUserRoles();
  const canCreate = hasPermission("abuse::create");

  const renderHeader = () => (
    <>
      <th className="w-16">Case</th>
      <th>VM</th>
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
        {c.vm_id != null ? (
          <Link to={`/vms/${c.vm_id}`} onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline">
            VM #{c.vm_id}
          </Link>
        ) : (
          <span className="text-slate-500">none</span>
        )}
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
            <Link to={`/abuse?user=${userId}`} className="text-blue-400 hover:underline">
              All cases
            </Link>
            {canCreate && (
              <Button variant="secondary" size="sm" onClick={() => navigate("/abuse")}>
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
        apiCall={(params) => adminApi.getAbuseCases({ ...params, user_id: userId })}
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
          <div className="py-4 text-center text-sm text-slate-500">No abuse cases for this customer</div>
        )}
        itemsPerPage={10}
        errorAction="load abuse cases"
        loadingMessage="Loading abuse cases..."
        dependencies={[userId]}
        inlineError
        tableClassName="text-sm"
      />
    </div>
  );
}
