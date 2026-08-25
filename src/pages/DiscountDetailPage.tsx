import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  PencilIcon,
  TicketIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, DetailList, DetailRow } from "../components/Card";
import { minorUnitsHuman, RulePreviewPanel } from "../components/DiscountRulePreview";
import { ErrorState } from "../components/ErrorState";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminDiscountRedemptionInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";
import { EditDiscountModal } from "./DiscountsPage";

export function DiscountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const discountId = parseInt(id!, 10);
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { hasPermission } = useUserRoles();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

  const {
    data: discount,
    loading,
    error,
    retry,
  } = useApiCall(() => adminApi.getDiscount(discountId), [discountId, refreshTrigger]);

  const refresh = () => setRefreshTrigger((n) => n + 1);

  const canUpdate = hasPermission("discount::update");
  const canDelete = hasPermission("discount::delete");

  if (error) {
    return <ErrorState error={error} onRetry={retry} action="load discount" />;
  }

  if (loading || !discount) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading discount...</div>
      </div>
    );
  }

  const now = Date.now();
  const notStarted = new Date(discount.valid_from).getTime() > now;
  const expired = discount.valid_to != null && new Date(discount.valid_to).getTime() <= now;
  const exhausted = discount.usage_limit != null && discount.used_count >= discount.usage_limit;

  const status = !discount.active
    ? { label: "Inactive", cls: "border-slate-600 bg-slate-700/40 text-slate-400" }
    : expired
      ? { label: "Expired", cls: "border-orange-500/40 bg-orange-500/10 text-orange-400" }
      : exhausted
        ? { label: "Exhausted", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" }
        : notStarted
          ? { label: "Scheduled", cls: "border-blue-500/40 bg-blue-500/10 text-blue-400" }
          : { label: "Active", cls: "border-green-500/40 bg-green-500/10 text-green-400" };

  const handleDelete = async () => {
    if (discount.used_count > 0) {
      toastService.error(
        "Cannot delete discount",
        `This discount has ${discount.used_count} redemption(s). Its redemption rows are the record of what the campaign cost — deactivate it instead.`,
      );
      return;
    }
    if (
      await confirmDialog({
        title: "Delete Discount",
        message: `Are you sure you want to permanently delete discount "${discount.code}"? It has no redemptions.`,
        confirmText: "Delete",
        variant: "danger",
      })
    ) {
      try {
        await adminApi.deleteDiscount(discount.id);
        navigate("/discounts");
      } catch (error) {
        console.error("Failed to delete discount:", error);
      }
    }
  };

  const handleToggleActive = async () => {
    try {
      await adminApi.updateDiscount(discount.id, { active: !discount.active });
      refresh();
    } catch (error) {
      console.error("Failed to update discount:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/discounts" className="text-slate-400 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <TicketIcon className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="rounded bg-blue-900 px-2 py-0.5 font-mono text-lg text-blue-200">{discount.code}</span>
              {discount.name && <span className="ml-3 text-xl text-slate-300">{discount.name}</span>}
            </h1>
            <p className="text-sm text-slate-400">
              Discount #{discount.id} · Company #{discount.company_id}
            </p>
          </div>
          <span
            className={`ml-2 inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold ${status.cls}`}
          >
            {status.label.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {canUpdate && (
            <Button variant="secondary" size="sm" onClick={handleToggleActive}>
              {discount.active ? "Deactivate" : "Activate"}
            </Button>
          )}
          {canUpdate && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost-danger" size="sm" onClick={handleDelete} disabled={discount.used_count > 0}>
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card title="Campaign" icon={<TicketIcon className="h-5 w-5" />}>
          <DetailList>
            <DetailRow label="Code" value={<span className="font-mono">{discount.code}</span>} />
            <DetailRow
              label="Status"
              value={
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${status.cls}`}
                >
                  {status.label}
                </span>
              }
            />
            <DetailRow label="Created" value={new Date(discount.created).toLocaleString()} />
            <DetailRow
              label="Valid From"
              value={`${new Date(discount.valid_from).toLocaleString()}${notStarted ? " (not started yet)" : ""}`}
            />
            <DetailRow
              label="Valid To"
              value={
                discount.valid_to ? (
                  <span>
                    {new Date(discount.valid_to).toLocaleString()}
                    {expired && <span className="ml-1 text-orange-400">(expired)</span>}
                  </span>
                ) : (
                  <span className="text-slate-500">no expiry</span>
                )
              }
            />
            <DetailRow
              label="Usage"
              value={
                <span className="font-mono">
                  {discount.used_count}
                  {discount.usage_limit != null ? (
                    <>
                      <span className="text-slate-500">/{discount.usage_limit}</span>
                      {exhausted && <span className="ml-1 text-yellow-400">(exhausted)</span>}
                    </>
                  ) : (
                    <span className="text-slate-500">/unlimited</span>
                  )}
                </span>
              }
            />
            <DetailRow
              label="Per-User Limit"
              value={discount.per_user_limit != null ? String(discount.per_user_limit) : "unlimited"}
            />
          </DetailList>
        </Card>

        {/* Rule */}
        <Card title="Rule (CEL)" icon={<BanknotesIcon className="h-5 w-5" />}>
          <pre className="mb-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap break-words">
            {discount.rule}
          </pre>
          <p className="mb-4 text-xs text-slate-500">
            The rule is evaluated on the server and clamped (percent 0–100, amount never more than the order total), so
            a badly written rule cannot over-discount an order. <code>{`{}`}</code>, <code>null</code> and{" "}
            <code>false</code> mean "does not apply".
          </p>
          <RulePreviewPanel rule={discount.rule} />
        </Card>
      </div>

      {/* Given away */}
      <Card title="Given Away" icon={<BanknotesIcon className="h-5 w-5" />}>
        {discount.given_away.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing given away yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discount.given_away.map((g) => (
              <div key={g.currency} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">{g.currency}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-amber-300">
                  {minorUnitsHuman(g.amount, g.currency)}
                </div>
                <div className="text-[11px] text-slate-500">recorded in the customer's payment currency</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Redemptions */}
      <RedemptionsTable discountId={discount.id} discountCode={discount.code} />

      {showEditModal && (
        <EditDiscountModal
          discount={discount}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function RedemptionsTable({ discountId, discountCode }: { discountId: number; discountCode: string }) {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>User</th>
      <th>Payment</th>
      <th>Amount Off</th>
      <th>Status</th>
      <th>Redeemed At</th>
    </>
  );

  const renderRow = (r: AdminDiscountRedemptionInfo, index: number) => (
    <tr key={r.id || index}>
      <td className="whitespace-nowrap align-top text-slate-400">{r.id}</td>
      <td className="align-top">
        <Link to={`/users/${r.user_id}`} className="text-blue-400 hover:underline">
          User #{r.user_id}
        </Link>
      </td>
      <td className="align-top font-mono text-xs text-slate-400">
        <span title={r.subscription_payment_id}>{r.subscription_payment_id.slice(0, 20)}…</span>
      </td>
      <td className="align-top whitespace-nowrap font-mono text-amber-300">
        {minorUnitsHuman(r.amount_off, r.currency)} {r.currency}
      </td>
      <td className="align-top whitespace-nowrap">
        <StatusBadge status={r.settled ? "active" : "unknown"}>{r.settled ? "SETTLED" : "PENDING"}</StatusBadge>
      </td>
      <td className="align-top whitespace-nowrap text-slate-300">
        {new Date(r.settled_at ?? r.created).toLocaleString()}
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <p>No redemptions of {discountCode} yet</p>
    </div>
  );

  return (
    <Card title="Redemptions" icon={<BanknotesIcon className="h-5 w-5" />}>
      <PaginatedTable
        apiCall={(params) => adminApi.getDiscountRedemptions(discountId, params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        itemsPerPage={20}
        errorAction="view redemptions"
        loadingMessage="Loading redemptions..."
        inlineError
        tableClassName="text-sm"
      />
    </Card>
  );
}
