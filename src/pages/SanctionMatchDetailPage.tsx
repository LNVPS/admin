import { ArrowLeftIcon, ArrowPathIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, DetailList, DetailRow } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Pill } from "../components/Pill";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminSanctionsMatchDetail } from "../lib/api";
import { promptDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";
import {
  FIELD_LABEL,
  formatMsatAsSats,
  formatScore,
  isOpenStatus,
  MATCH_STATUS_LABEL,
  MATCH_STATUS_VARIANT,
} from "../utils/sanctions";

type Resolution = "clear" | "confirm";

export function SanctionMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id!, 10);
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const canUpdate = hasPermission("sanctions::update");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [resolving, setResolving] = useState(false);

  const {
    data: match,
    loading,
    error,
    retry,
  } = useApiCall(() => adminApi.getSanctionsMatch(matchId), [matchId, refreshTrigger]);

  const refresh = () => setRefreshTrigger((n) => n + 1);

  if (error) return <ErrorState error={error} onRetry={retry} action="load sanctions match" />;
  if (loading || !match) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading match...</div>
      </div>
    );
  }

  const open = isOpenStatus(match.status);
  const heldDeposit = match.subject === "payment" && match.screening?.held === true && match.screening.released_at == null;

  const resolve = async (kind: Resolution) => {
    const clearing = kind === "clear";
    const target = match.subject === "payment" ? `deposit ${match.payment_ref}` : `customer #${match.user_id}`;
    const effect = clearing
      ? match.subject === "payment"
        ? "If this is the last blocking match, the held deposit is released and credited exactly once."
        : "If this is the last blocking match, new orders for the customer are released. Existing VMs are not touched."
      : "The hold stays. Customers with a confirmed match stay held for new orders. Existing VMs are not touched.";
    const reason = await promptDialog({
      title: clearing ? "Clear match" : "Confirm match",
      message: `${clearing ? "Clear" : "Confirm"} match #${match.id} for ${target}? ${effect}`,
      label: "Reason (required, kept in the audit log)",
      confirmText: clearing ? "Clear match" : "Confirm match",
      required: true,
    });
    if (reason == null || reason.trim() === "") return;
    setResolving(true);
    try {
      if (clearing) {
        await adminApi.clearSanctionsMatch(match.id, reason.trim());
      } else {
        await adminApi.confirmSanctionsMatch(match.id, reason.trim());
      }
      toastService.success(clearing ? "Match cleared" : "Match confirmed");
      refresh();
    } catch (e) {
      toastService.error(
        clearing ? "Failed to clear match" : "Failed to confirm match",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/sanctions" className="text-slate-400 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <ShieldExclamationIcon className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Sanctions Match #{match.id}</h1>
            <p className="text-sm text-slate-400">{match.subject === "payment" ? "Deposit" : "Customer"}</p>
          </div>
          <Pill variant={MATCH_STATUS_VARIANT[match.status]}>{MATCH_STATUS_LABEL[match.status]}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {canUpdate && open && (
            <>
              <Button size="sm" onClick={() => resolve("clear")} disabled={resolving}>
                Clear
              </Button>
              <Button variant="danger" size="sm" onClick={() => resolve("confirm")} disabled={resolving}>
                Confirm
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MatchCard match={match} />
        <ResolutionCard match={match} />
      </div>

      {match.subject === "payment" && match.screening && (
        <Card title="Held deposit">
          <DetailList>
            <DetailRow label="Payment reference" value={<span className="break-all font-mono">{match.screening.payment_ref}</span>} />
            <DetailRow label="Amount" value={formatMsatAsSats(match.screening.amount_msat)} />
            <DetailRow
              label="Paying addresses"
              value={
                <div className="space-y-1">
                  {match.screening.source_addresses.map((a) => (
                    <div key={a} className="break-all font-mono text-xs">
                      {a}
                    </div>
                  ))}
                </div>
              }
            />
            <DetailRow label="Mode" value={match.screening.mode} />
            <DetailRow
              label="State"
              value={
                match.screening.released_at ? (
                  <Pill variant="success">Released {new Date(match.screening.released_at).toLocaleString()}</Pill>
                ) : match.screening.held ? (
                  <Pill variant="danger">Held</Pill>
                ) : (
                  <Pill variant="default">Not held</Pill>
                )
              }
            />
          </DetailList>
          {heldDeposit && open && (
            <p className="mt-3 text-sm text-slate-400">
              Clearing the last blocking match releases the deposit. It is credited exactly once.
            </p>
          )}
        </Card>
      )}

      {match.subject === "user" && match.orders_held != null && (
        <Card title="Customer orders">
          {match.orders_held ? (
            <Pill variant="danger">New orders are on hold</Pill>
          ) : (
            <Pill variant="success">New orders are not on hold</Pill>
          )}
          <p className="mt-3 text-sm text-slate-400">Existing VMs are never touched automatically.</p>
        </Card>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: AdminSanctionsMatchDetail }) {
  return (
    <Card title="Match">
      <DetailList>
        <DetailRow
          label="Subject"
          value={
            match.user_id != null ? (
              <Link to={`/users/${match.user_id}`} className="text-blue-400 hover:underline">
                User #{match.user_id}
              </Link>
            ) : (
              <span className="text-slate-500">none</span>
            )
          }
        />
        {match.payment_ref && (
          <DetailRow label="Payment" value={<span className="break-all font-mono">{match.payment_ref}</span>} />
        )}
        <DetailRow label="Field" value={FIELD_LABEL[match.field]} />
        <DetailRow label="Value" value={<span className="break-all font-mono text-xs">{match.subject_value}</span>} />
        <DetailRow label="Matched entry" value={<span className="break-words">{match.entry_name}</span>} />
        <DetailRow label="Entry ID" value={<span className="font-mono">{match.entry_id}</span>} />
        <DetailRow label="Score" value={formatScore(match.score)} />
        <DetailRow label="List" value={`${match.list_source} ${match.list_version}`} />
        {match.list_fetched && <DetailRow label="List fetched" value={new Date(match.list_fetched).toLocaleString()} />}
        <DetailRow label="Created" value={new Date(match.created).toLocaleString()} />
      </DetailList>
    </Card>
  );
}

function ResolutionCard({ match }: { match: AdminSanctionsMatchDetail }) {
  return (
    <Card title="Resolution">
      {isOpenStatus(match.status) ? (
        <p className="text-sm text-slate-400">Not resolved yet.</p>
      ) : (
        <DetailList>
          <DetailRow label="Outcome" value={MATCH_STATUS_LABEL[match.status]} />
          <DetailRow
            label="Resolved by"
            value={match.resolved_by != null ? `Admin #${match.resolved_by}` : "unknown"}
          />
          {match.resolved_at && <DetailRow label="Resolved" value={new Date(match.resolved_at).toLocaleString()} />}
          <DetailRow
            label="Reason"
            value={<span className="whitespace-pre-wrap">{match.resolution_reason ?? "none"}</span>}
          />
        </DetailList>
      )}
    </Card>
  );
}
