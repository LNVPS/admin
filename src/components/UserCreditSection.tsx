import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AccountCreditEventKind, AdminAccountCreditEvent, AdminCreditBalance } from "../lib/api";
import { creditBalances, creditDeltaMinor, creditUnitLabel } from "../utils/credit";
import { formatCurrency, signedAmountClass } from "../utils/currency";
import { Button } from "./Button";
import { SectionHeading } from "./Facts";
import { Modal } from "./Modal";
import { PaginatedTable } from "./PaginatedTable";
import { PaymentSwapLog } from "./PaymentSwapLog";

const KIND_STYLE: Record<AccountCreditEventKind, string> = {
  topup: "bg-green-500/10 text-green-400",
  spend: "bg-amber-500/10 text-amber-400",
  refund: "bg-blue-500/10 text-blue-400",
  admin: "bg-purple-500/10 text-purple-400",
  settlement: "bg-cyan-500/10 text-cyan-400",
};

export function UserCreditSection({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const canUpdate = hasPermission("account_credit::update");

  const { data: credit, loading, error } = useApiCall(() => adminApi.getUserCredit(userId), [userId, refreshTrigger]);

  const balances = credit ? creditBalances(credit) : [];

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const renderHeader = () => (
    <>
      <th>Kind</th>
      <th className="text-right">Amount</th>
      <th>Payment</th>
      <th>Note</th>
      <th>Created</th>
    </>
  );

  const renderRow = (event: AdminAccountCreditEvent, index: number) => (
    <tr key={event.id || index}>
      <td className="align-top">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[event.kind] ?? "bg-slate-500/10 text-slate-300"}`}
        >
          {event.kind}
        </span>
      </td>
      <td className={`align-top text-right text-sm tabular-nums ${signedAmountClass(event.amount, "text-green-400")}`}>
        {event.amount > 0 ? "+" : ""}
        {formatCurrency(event.amount, event.currency)}
      </td>
      <td className="align-top">
        {event.subscription_payment_id ? (
          <div
            className="max-w-[10rem] truncate font-mono text-xs text-slate-400"
            title={event.subscription_payment_id}
          >
            {event.subscription_payment_id}
          </div>
        ) : (
          <span className="text-slate-500">—</span>
        )}
        {event.kind === "topup" && event.subscription_payment_id && (
          <PaymentSwapLog paymentId={event.subscription_payment_id} userId={userId} />
        )}
      </td>
      <td className="align-top text-sm text-gray-300">{event.note ?? <span className="text-slate-500">—</span>}</td>
      <td className="align-top text-sm text-gray-300">{new Date(event.created).toLocaleString()}</td>
    </tr>
  );

  return (
    <div className="space-y-2">
      <SectionHeading
        icon={<BanknotesIcon className="h-4 w-4 text-slate-500" />}
        action={
          canUpdate && (
            <Button size="sm" onClick={() => setAdjusting(true)} disabled={!credit}>
              Adjust balance
            </Button>
          )
        }
      >
        Account credit
      </SectionHeading>

      {loading && !credit && <div className="text-sm text-gray-400">Loading credit...</div>}
      {error && !credit && <div className="text-sm text-red-400">Failed to load credit: {error.message}</div>}
      {credit && (
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex flex-wrap items-stretch gap-2">
            {balances.map((b) => (
              <button
                type="button"
                key={b.currency}
                onClick={() => setCurrencyFilter(currencyFilter === b.currency ? null : b.currency)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  currencyFilter === b.currency ? "border-blue-500 bg-slate-800" : "border-slate-700 bg-slate-800/50"
                }`}
              >
                <div className="text-xs uppercase tracking-wider text-slate-400">
                  {b.currency}
                  {b.currency === credit.currency && <span className="ml-1 text-blue-400">base</span>}
                </div>
                <div className="text-lg font-semibold text-white tabular-nums">
                  {formatCurrency(b.balance, b.currency)}
                </div>
              </button>
            ))}
          </div>
          <div>
            Auto-apply:{" "}
            <span className={credit.auto_apply ? "font-medium text-green-400" : "font-medium text-slate-400"}>
              {credit.auto_apply ? "On" : "Off"}
            </span>
            {currencyFilter && (
              <span className="ml-4">
                History: {currencyFilter}{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-300"
                  onClick={() => setCurrencyFilter(null)}
                >
                  show all
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <PaginatedTable
        apiCall={(params) => adminApi.getUserCreditEvents(userId, { ...params, currency: currencyFilter ?? undefined })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        itemsPerPage={10}
        errorAction="load credit ledger"
        loadingMessage="Loading credit ledger..."
        minWidth="700px"
        inlineError={true}
        dependencies={[userId, refreshTrigger, currencyFilter]}
        renderEmptyState={() => <div className="text-center py-8 text-gray-400">No credit movements for this user</div>}
      />

      {adjusting && credit && (
        <AdjustCreditModal
          userId={userId}
          balances={balances}
          defaultCurrency={currencyFilter ?? credit.currency}
          onClose={() => setAdjusting(false)}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

function AdjustCreditModal({
  userId,
  balances,
  defaultCurrency,
  onClose,
  onSuccess,
}: {
  userId: number;
  balances: AdminCreditBalance[];
  defaultCurrency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"grant" | "clawback">("grant");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [sats, setSats] = useState("");
  const [note, setNote] = useState("");

  const current = balances.find((b) => b.currency === currency)?.balance ?? 0;
  const amountSats = Number(sats);
  const valid = Number.isFinite(amountSats) && amountSats > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      await adminApi.adjustUserCredit(userId, {
        currency,
        delta: creditDeltaMinor(amountSats, direction, currency),
        kind: "admin",
        note: note.trim() === "" ? undefined : note.trim(),
      });
      success(direction === "grant" ? "Credit granted" : "Credit clawed back");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to adjust credit:", error);
      showError("Failed to adjust credit", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Adjust Account Credit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-gray-400">
          Current balance: <span className="font-medium text-white">{formatCurrency(current, currency)}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {balances.map((b) => (
              <option key={b.currency} value={b.currency}>
                {b.currency}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">Action</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as "grant" | "clawback")}>
            <option value="grant">Grant credit</option>
            <option value="clawback">Claw back credit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">Amount ({creditUnitLabel(currency)})</label>
          <input
            type="number"
            min="0"
            step="any"
            value={sats}
            onChange={(e) => setSats(e.target.value)}
            placeholder="e.g. 100"
            required
          />
          {direction === "clawback" && (
            <p className="mt-1 text-xs text-slate-400">
              Credit held by the user's pending orders cannot be clawed back.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-2">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shown in the ledger (optional)"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !valid}>
            {loading ? "Saving..." : "Apply"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
