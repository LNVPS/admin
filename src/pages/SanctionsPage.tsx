import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { PaginatedTable } from "../components/PaginatedTable";
import { Pill } from "../components/Pill";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminPaymentScreening, AdminSanctionsMatch, SanctionsMatchStatus, SanctionsSubject } from "../lib/api";
import { toastService } from "../services/toastService";
import { formatRelative } from "../utils/relativeTime";
import {
  FIELD_LABEL,
  formatMsatAsSats,
  formatScore,
  MATCH_STATUS_LABEL,
  MATCH_STATUS_VARIANT,
} from "../utils/sanctions";

type Tab = "matches" | "held" | "lists";
type StatusFilter = "open" | "all" | SanctionsMatchStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "matches", label: "Matches" },
  { id: "held", label: "Held deposits" },
  { id: "lists", label: "Lists" },
];

export function SanctionsPage() {
  const [tab, setTab] = useState<Tab>("matches");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldExclamationIcon className="h-7 w-7 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Sanctions</h1>
          <p className="text-sm text-slate-400">
            Matches against the OFAC and EU lists. A hit holds and flags for review, nothing is rejected outright.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-700 pb-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
            className="shrink-0"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "matches" && <MatchesTab />}
      {tab === "held" && <HeldDepositsTab />}
      {tab === "lists" && <ListsTab />}
    </div>
  );
}

function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 basis-36">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function MatchesTab() {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>(params.has("payment_ref") ? "all" : "open");
  const [subject, setSubject] = useState<"" | SanctionsSubject>("");
  const [userId, setUserId] = useState(params.get("user") ?? "");
  const [paymentRef, setPaymentRef] = useState(params.get("payment_ref") ?? "");

  const parsedUser = userId.trim() === "" ? undefined : Number(userId);
  const parsedRef = paymentRef.trim() === "" ? undefined : paymentRef.trim();

  const renderHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Subject</th>
      <th>Field</th>
      <th>Value</th>
      <th>List</th>
      <th>Matched entry</th>
      <th>Score</th>
      <th>Status</th>
      <th>Age</th>
    </>
  );

  const renderRow = (m: AdminSanctionsMatch, index: number) => (
    <tr key={m.id || index} className="cursor-pointer" onClick={() => navigate(`/sanctions/matches/${m.id}`)}>
      <td className="whitespace-nowrap align-top text-slate-400">
        <Link
          to={`/sanctions/matches/${m.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-blue-400 hover:underline"
        >
          #{m.id}
        </Link>
      </td>
      <td className="align-top whitespace-nowrap">
        {m.subject === "user" && m.user_id != null ? (
          <Link
            to={`/users/${m.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:underline"
          >
            User #{m.user_id}
          </Link>
        ) : (
          <span className="font-mono text-xs text-slate-200">{m.payment_ref ?? "payment"}</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap">{FIELD_LABEL[m.field]}</td>
      <td className="align-top">
        <div className="max-w-[16rem] truncate font-mono text-xs text-slate-200" title={m.subject_value}>
          {m.subject_value}
        </div>
      </td>
      <td className="align-top whitespace-nowrap text-slate-300">{`${m.list_source} ${m.list_version}`}</td>
      <td className="align-top">
        <div className="max-w-[16rem] truncate text-slate-200" title={m.entry_name}>
          {m.entry_name}
        </div>
      </td>
      <td className="align-top whitespace-nowrap">{formatScore(m.score)}</td>
      <td className="align-top whitespace-nowrap">
        <Pill variant={MATCH_STATUS_VARIANT[m.status]}>{MATCH_STATUS_LABEL[m.status]}</Pill>
      </td>
      <td className="align-top whitespace-nowrap text-slate-300" title={new Date(m.created).toLocaleString()}>
        {formatRelative(m.created)}
      </td>
    </tr>
  );

  return (
    <PaginatedTable
      apiCall={(params) =>
        adminApi.getSanctionsMatches({
          ...params,
          open: status === "open" ? true : undefined,
          status: status === "open" || status === "all" ? undefined : status,
          subject: subject === "" ? undefined : subject,
          user_id: parsedUser,
          payment_ref: parsedRef,
        })
      }
      toolbar={
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <FilterField id="status" label="Status">
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="open">Open</option>
              <option value="all">All</option>
              <option value="review">Review</option>
              <option value="held">Held</option>
              <option value="cleared">Cleared</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </FilterField>
          <FilterField id="subject" label="Subject">
            <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value as "" | SanctionsSubject)}>
              <option value="">Any</option>
              <option value="user">User</option>
              <option value="payment">Payment</option>
            </select>
          </FilterField>
          <FilterField id="user-id" label="User ID">
            <input
              id="user-id"
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="any"
            />
          </FilterField>
          <FilterField id="payment-ref" label="Payment reference">
            <input
              id="payment-ref"
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="txid:vout"
            />
          </FilterField>
        </div>
      }
      renderHeader={renderHeader}
      renderRow={renderRow}
      renderEmptyState={() => <div className="py-8 text-center text-slate-400">No sanctions matches</div>}
      calculateStats={(_items, total) => <StatsHeader stats={[{ label: "Matches", value: total }]} />}
      dependencies={[status, subject, parsedUser, parsedRef]}
      itemsPerPage={20}
      errorAction="load sanctions matches"
      loadingMessage="Loading sanctions matches..."
      minWidth="1000px"
    />
  );
}

function HeldDepositsTab() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th>Payment reference</th>
      <th>Amount</th>
      <th>Paying addresses</th>
      <th>Mode</th>
      <th>Match</th>
      <th>Age</th>
    </>
  );

  const renderRow = (s: AdminPaymentScreening, index: number) => (
    <tr key={s.id || index}>
      <td className="align-top font-mono text-xs text-slate-200">
        <div className="max-w-[16rem] truncate" title={s.payment_ref}>
          {s.payment_ref}
        </div>
      </td>
      <td className="align-top whitespace-nowrap">{formatMsatAsSats(s.amount_msat)}</td>
      <td className="align-top">
        {s.source_addresses.length === 0 ? (
          <span className="text-slate-500">none</span>
        ) : (
          <div className="space-y-1">
            {s.source_addresses.map((a) => (
              <div key={a} className="max-w-[20rem] truncate font-mono text-xs text-slate-200" title={a}>
                {a}
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="align-top whitespace-nowrap">
        <Pill variant={s.mode === "unscreened" ? "warning" : "default"}>{s.mode}</Pill>
      </td>
      <td className="align-top whitespace-nowrap">
        <MatchLink paymentRef={s.payment_ref} />
      </td>
      <td className="align-top whitespace-nowrap text-slate-300" title={new Date(s.created).toLocaleString()}>
        {formatRelative(s.created)}
      </td>
    </tr>
  );

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getSanctionsScreenings({ ...params, held: true })}
      renderHeader={renderHeader}
      renderRow={renderRow}
      renderEmptyState={() => <div className="py-8 text-center text-slate-400">No held deposits</div>}
      calculateStats={(_items, total) => <StatsHeader stats={[{ label: "Held deposits", value: total }]} />}
      itemsPerPage={20}
      errorAction="load held deposits"
      loadingMessage="Loading held deposits..."
      minWidth="900px"
    />
  );
}

function MatchLink({ paymentRef }: { paymentRef: string }) {
  const adminApi = useAdminApi();
  const { data, loading } = useApiCall(
    () => adminApi.getSanctionsMatches({ payment_ref: paymentRef, limit: 5 }),
    [paymentRef],
  );
  if (loading) return <span className="text-slate-500">...</span>;
  const matches = data?.data ?? [];
  if (matches.length === 0) return <span className="text-slate-500">none</span>;
  return (
    <span className="flex flex-wrap gap-2">
      {matches.map((m) => (
        <Link key={m.id} to={`/sanctions/matches/${m.id}`} className="text-blue-400 hover:underline">
          #{m.id} {MATCH_STATUS_LABEL[m.status]}
        </Link>
      ))}
    </span>
  );
}

function ListsTab() {
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const canUpdate = hasPermission("sanctions::update");
  const [refreshing, setRefreshing] = useState(false);
  const [reload, setReload] = useState(0);
  const { data, loading, error, retry } = useApiCall(() => adminApi.getSanctionsLists(), [reload]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await adminApi.refreshSanctionsLists();
      toastService.success("Refresh queued", "The worker fetches the lists now");
      setReload((n) => n + 1);
    } catch (e) {
      toastService.error("Failed to queue refresh", e instanceof Error ? e.message : undefined);
    } finally {
      setRefreshing(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={retry} action="load sanctions lists" />;

  return (
    <Card
      title="List versions"
      actions={
        canUpdate && (
          <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Queueing..." : "Refresh lists"}
          </Button>
        )
      }
    >
      {loading ? (
        <div className="py-4 text-center text-sm text-slate-400">Loading lists...</div>
      ) : (data ?? []).length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-400">No lists loaded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className={clsx("w-full min-w-[640px] text-sm")}>
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-gray-400">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Version</th>
                <th className="py-2 pr-3">Entries</th>
                <th className="py-2 pr-3">Fetched</th>
                <th className="py-2 pr-3">Last checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(data ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-200">{l.source}</td>
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">{l.version}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{l.entry_count}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.fetched).toLocaleString()}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.checked).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
