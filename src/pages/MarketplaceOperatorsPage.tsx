import { ArrowPathIcon, PencilIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminMarketplaceOperatorInfo, MarketplaceOperatorMode } from "../lib/api";
import { toastService } from "../services/toastService";

const MODE_LABEL: Record<MarketplaceOperatorMode, string> = {
  lightning_address: "Lightning address",
  nwc: "Nostr Wallet Connect",
  account_credit: "Account credit",
  on_chain: "On-chain",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function MarketplaceOperatorsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editing, setEditing] = useState<AdminMarketplaceOperatorInfo | null>(null);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Operator</th>
      <th>Revenue share</th>
      <th>Payout</th>
      <th>Threshold</th>
      <th>Nodes</th>
      <th>Status</th>
      <th>Created</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (operator: AdminMarketplaceOperatorInfo, index: number) => (
    <tr key={operator.id || index}>
      <td className="whitespace-nowrap align-top text-white">{operator.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate font-mono text-xs text-gray-400" title={operator.user_pubkey}>
            {operator.user_pubkey.slice(0, 16)}…
          </div>
          <div className="text-[11px] text-gray-500">user #{operator.user_id}</div>
        </div>
      </td>
      <td className="align-top text-gray-300">
        {operator.rate !== null ? `${operator.rate}%` : <span className="text-gray-500">company default</span>}
      </td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate text-gray-300" title={operator.address ?? undefined}>
            {operator.address ?? <span className="text-gray-500">no address</span>}
          </div>
          <div className="text-[11px] text-gray-500">{MODE_LABEL[operator.mode]}</div>
        </div>
      </td>
      <td className="align-top text-gray-300">
        {operator.payout_threshold !== null ? `${operator.payout_threshold.toLocaleString()} sats` : "—"}
      </td>
      <td className="align-top text-gray-300">{operator.node_count}</td>
      <td className="align-top">
        {operator.enabled ? (
          <StatusBadge status="active">Enabled</StatusBadge>
        ) : (
          <StatusBadge status="inactive">Disabled</StatusBadge>
        )}
      </td>
      <td className="align-top whitespace-nowrap text-gray-400">{formatDateTime(operator.created)}</td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" title="Edit revenue share & payout" onClick={() => setEditing(operator)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <UsersIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No marketplace operators</h3>
      <p className="mt-1 text-sm text-gray-500">Operators appear here once they enrol and register hardware.</p>
    </div>
  );

  const calculateStats = (operators: AdminMarketplaceOperatorInfo[], totalItems: number) => {
    const enabled = operators.filter((o) => o.enabled).length;
    const disabled = operators.filter((o) => !o.enabled).length;
    const totalNodes = operators.reduce((sum, o) => sum + o.node_count, 0);

    return (
      <StatsHeader
        title="Marketplace Operators"
        subtitle="Operator revenue-share and payout configuration. Stopping a misbehaving node does not change what someone is paid."
        stats={[
          { label: "Total", value: totalItems },
          { label: "Enabled", value: enabled, tone: "success" },
          { label: "Disabled", value: disabled, tone: "danger" },
          { label: "Nodes", value: totalNodes, tone: "accent" },
        ]}
        actions={
          <Button variant="secondary" onClick={refreshData}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getMarketplaceOperators(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view marketplace operators"
        loadingMessage="Loading marketplace operators..."
        dependencies={[refreshTrigger]}
        minWidth="1000px"
      />

      {editing && (
        <EditOperatorModal
          operator={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function EditOperatorModal({
  operator,
  onClose,
  onSuccess,
}: {
  operator: AdminMarketplaceOperatorInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<string>(operator.rate !== null ? String(operator.rate) : "");
  const [threshold, setThreshold] = useState<string>(
    operator.payout_threshold !== null ? String(operator.payout_threshold) : "",
  );
  const [address, setAddress] = useState<string>(operator.address ?? "");
  const [mode, setMode] = useState<MarketplaceOperatorMode>(operator.mode);
  const [enabled, setEnabled] = useState(operator.enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updates: {
        rate?: number | null;
        payout_threshold?: number | null;
        address?: string | null;
        mode?: MarketplaceOperatorMode;
        enabled?: boolean;
      } = {
        mode,
        enabled,
      };
      // Empty input clears the override back to the company default.
      updates.rate = rate.trim() === "" ? null : Number(rate);
      updates.payout_threshold = threshold.trim() === "" ? null : Number(threshold);
      updates.address = address.trim() === "" ? null : address.trim();

      await adminApi.updateMarketplaceOperator(operator.id, updates);
      toastService.success("Operator updated");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update operator");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit operator — user #${operator.user_id}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Revenue share (%)</label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min={0}
              max={100}
              step="any"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder={operator.rate === null ? "Company default" : undefined}
            />
            <p className="text-xs text-gray-400 mt-1">
              Override (0-100). Blank reverts to the company default (
              {operator.rate === null ? "already default" : `currently ${operator.rate}%`}).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Payout threshold (sats)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min={0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder={operator.payout_threshold === null ? "System minimum" : undefined}
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum accrued earnings before an automated payout. Blank uses the system minimum.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Payout target</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="operator@example.com"
          />
          <p className="text-xs text-gray-400 mt-1">Its meaning depends on the payout rail below. Blank clears it.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Payout rail</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as MarketplaceOperatorMode)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {(Object.keys(MODE_LABEL) as MarketplaceOperatorMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-sm text-gray-300">Placement enabled (across this operator's nodes)</span>
        </label>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
