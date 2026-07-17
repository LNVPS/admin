import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  GiftIcon,
  PencilIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, DetailList, DetailRow } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { Profile } from "../components/Profile";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminReferralDetail, AdminReferralPayoutInfo, ReferralMode } from "../lib/api";
import { formatCurrency } from "../utils/currency";

const MODE_LABELS: Record<ReferralMode, string> = {
  lightning_address: "Lightning Address",
  nwc: "Nostr Wallet Connect",
  account_credit: "Account Credit",
};

/** Convert a major-unit amount string into smallest units (millisats for BTC, cents otherwise). */
function toSmallestUnits(value: number, currency: string): number {
  return Math.round(value * (currency === "BTC" ? 1000 : 100));
}

export function ReferralProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const referralId = parseInt(id!, 10);
  const api = useAdminApi();
  const { hasPermission } = useUserRoles();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showEditRate, setShowEditRate] = useState(false);
  const [showCreatePayout, setShowCreatePayout] = useState(false);

  const {
    data: referral,
    loading,
    error,
    retry,
  } = useApiCall(() => api.getReferral(referralId), [referralId, refreshTrigger]);

  const refresh = () => setRefreshTrigger((n) => n + 1);

  const canUpdate = hasPermission("referral::update");
  const canCreate = hasPermission("referral::create");

  if (error) {
    return <ErrorState error={error} onRetry={retry} action="load referral" />;
  }

  if (loading || !referral) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading referral...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/referral-program" className="text-slate-400 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <GiftIcon className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="rounded bg-blue-900 px-2 py-0.5 font-mono text-lg text-blue-200">{referral.code}</span>
            </h1>
            <p className="text-sm text-slate-400">Referral #{referral.id}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh}>
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrollment details */}
        <Card
          title="Enrollment"
          icon={<GiftIcon className="h-5 w-5" />}
          actions={
            canUpdate ? (
              <Button variant="ghost" size="sm" onClick={() => setShowEditRate(true)}>
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
            ) : undefined
          }
        >
          <DetailList>
            <DetailRow label="Code" value={<span className="font-mono">{referral.code}</span>} />
            <DetailRow
              label="Referrer"
              value={
                <div className="space-y-1">
                  <Profile pubkey={referral.user_pubkey} avatarSize="sm" />
                  <Link to={`/users/${referral.user_id}`} className="text-xs text-blue-400 hover:text-blue-300">
                    User #{referral.user_id}
                  </Link>
                </div>
              }
            />
            <DetailRow label="Payout Mode" value={MODE_LABELS[referral.mode] ?? referral.mode} />
            {referral.mode === "lightning_address" && (
              <DetailRow
                label="Lightning Address"
                value={
                  referral.lightning_address ? (
                    <span className="font-mono text-sm">{referral.lightning_address}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )
                }
              />
            )}
            <DetailRow
              label="Commission Rate"
              value={
                referral.referral_rate != null ? (
                  <span className="font-mono">{referral.referral_rate}%</span>
                ) : (
                  <span className="text-slate-400 italic">company default</span>
                )
              }
            />
            <DetailRow label="Created" value={new Date(referral.created).toLocaleString()} />
          </DetailList>
        </Card>

        {/* Earnings + counts */}
        <Card title="Earnings" icon={<BanknotesIcon className="h-5 w-5" />}>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Successful Referrals</div>
              <div className="mt-1 text-2xl font-semibold text-green-400">{referral.referrals_success}</div>
              <div className="text-[11px] text-slate-500">made ≥1 payment</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Unconverted Referrals</div>
              <div className="mt-1 text-2xl font-semibold text-slate-300">{referral.referrals_failed}</div>
              <div className="text-[11px] text-slate-500">never paid</div>
            </div>
          </div>
          <h4 className="mb-2 text-sm font-medium text-slate-300">Commission earned</h4>
          {referral.earned.length === 0 ? (
            <p className="text-sm text-slate-500">No commission earned yet.</p>
          ) : (
            <div className="space-y-1">
              {referral.earned.map((e) => (
                <div
                  key={e.currency}
                  className="flex items-center justify-between rounded bg-slate-900/40 px-3 py-1.5 text-sm"
                >
                  <span className="text-slate-400">{e.currency}</span>
                  <span className="font-mono text-slate-100">{formatCurrency(e.amount, e.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Payouts */}
      <Card
        title="Payouts"
        icon={<BanknotesIcon className="h-5 w-5" />}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setShowCreatePayout(true)}>
              <PlusIcon className="h-4 w-4" />
              Record Payout
            </Button>
          ) : undefined
        }
      >
        {referral.payouts.length === 0 ? (
          <p className="text-sm text-slate-500">No payouts recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-700 text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Created</th>
                  {canUpdate && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {referral.payouts.map((payout) => (
                  <PayoutRow
                    key={payout.id}
                    referralId={referralId}
                    payout={payout}
                    canUpdate={canUpdate}
                    onChanged={refresh}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showEditRate && <EditRateModal referral={referral} onClose={() => setShowEditRate(false)} onSuccess={refresh} />}
      {showCreatePayout && (
        <CreatePayoutModal
          referralId={referralId}
          defaultCurrency={referral.earned[0]?.currency ?? "BTC"}
          onClose={() => setShowCreatePayout(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

function PayoutRow({
  referralId,
  payout,
  canUpdate,
  onChanged,
}: {
  referralId: number;
  payout: AdminReferralPayoutInfo;
  canUpdate: boolean;
  onChanged: () => void;
}) {
  const api = useAdminApi();
  const { success, error: showError } = useToast();
  const [busy, setBusy] = useState(false);

  const handleTogglePaid = async () => {
    setBusy(true);
    try {
      await api.updateReferralPayout(referralId, payout.id, { is_paid: !payout.is_paid });
      success(`Payout marked ${payout.is_paid ? "unpaid" : "paid"}`);
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update payout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td className="py-2 pr-4 font-mono text-slate-400">#{payout.id}</td>
      <td className="py-2 pr-4 font-mono text-slate-100">{formatCurrency(payout.amount, payout.currency)}</td>
      <td className="py-2 pr-4">
        {payout.is_paid ? (
          <span className="inline-flex items-center gap-1 text-green-400">
            <CheckCircleIcon className="h-4 w-4" /> Paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-400">
            <XCircleIcon className="h-4 w-4" /> Unpaid
          </span>
        )}
      </td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-400">
        {payout.invoice ? (
          <span title={payout.invoice}>{payout.invoice.slice(0, 18)}…</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="py-2 pr-4 text-xs text-slate-400">{new Date(payout.created).toLocaleDateString()}</td>
      {canUpdate && (
        <td className="py-2">
          <Button variant="ghost" size="xs" disabled={busy} onClick={handleTogglePaid}>
            {payout.is_paid ? "Mark Unpaid" : "Mark Paid"}
          </Button>
        </td>
      )}
    </tr>
  );
}

function EditRateModal({
  referral,
  onClose,
  onSuccess,
}: {
  referral: AdminReferralDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const api = useAdminApi();
  const { success } = useToast();
  const [code, setCode] = useState(referral.code);
  const [useDefault, setUseDefault] = useState(referral.referral_rate == null);
  const [rate, setRate] = useState(referral.referral_rate != null ? String(referral.referral_rate) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Code must not be empty");
      return;
    }
    let value: number | null = null;
    if (!useDefault) {
      const parsed = parseFloat(rate);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Rate must be a number >= 0");
        return;
      }
      value = parsed;
    }
    const updates: { referral_rate: number | null; code?: string } = { referral_rate: value };
    if (trimmedCode !== referral.code) {
      updates.code = trimmedCode;
    }
    setSubmitting(true);
    try {
      await api.updateReferral(referral.id, updates);
      success("Referral updated");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update referral");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Referral" icon={PencilIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Referral Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Renaming cascades to existing VMs that recorded the old code, preserving prior attribution.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />
          Use company default rate
        </label>
        {!useDefault && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Commission Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Whole percent applied to a referred VM's first payment (e.g. 12.5 = 12.5%).
            </p>
          </div>
        )}
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreatePayoutModal({
  referralId,
  defaultCurrency,
  onClose,
  onSuccess,
}: {
  referralId: number;
  defaultCurrency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const api = useAdminApi();
  const { success } = useToast();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [invoice, setInvoice] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      await api.createReferralPayout(referralId, {
        amount: toSmallestUnits(parsed, currency),
        currency,
        invoice: invoice.trim() || undefined,
        is_paid: isPaid,
      });
      success("Payout recorded");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Record Payout" icon={PlusIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Amount ({currency === "BTC" ? "sats" : currency})
            </label>
            <input
              type="number"
              step="0.00000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Invoice (Optional)</label>
          <input
            type="text"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="lnbc..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          Mark as already paid (reconciling an out-of-band payment)
        </label>
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Recording..." : "Record Payout"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
