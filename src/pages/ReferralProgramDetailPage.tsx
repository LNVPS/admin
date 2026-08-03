import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  GiftIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, DetailList, DetailRow } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { MoneyAmountInput } from "../components/MoneyInput";
import { Profile } from "../components/Profile";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminReferralBalance, AdminReferralDetail, AdminReferralPayoutInfo, ReferralMode } from "../lib/api";
import { formatCurrency } from "../utils/currency";

const MODE_LABELS: Record<ReferralMode, string> = {
  lightning_address: "Lightning Address",
  nwc: "Nostr Wallet Connect",
  account_credit: "Account Credit",
  on_chain: "On-Chain",
};

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
            <DetailRow
              label="Payout Address"
              value={
                referral.address ? (
                  referral.mode === "on_chain" ? (
                    <a
                      href={`https://mempool.space/address/${referral.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm break-all text-blue-400 hover:underline"
                    >
                      {referral.address} ↗
                    </a>
                  ) : (
                    <span className="font-mono text-sm break-all">{referral.address}</span>
                  )
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
            />
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
            <DetailRow
              label="Payout Threshold"
              value={
                referral.payout_threshold != null ? (
                  <span className="font-mono">{referral.payout_threshold.toLocaleString()} sats</span>
                ) : (
                  <span className="text-slate-400 italic">system minimum</span>
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

        {/* Outstanding balance vs the payout threshold */}
        <OutstandingCard referral={referral} />
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
                  <th className="py-2 pr-4">Settled</th>
                  <th className="py-2 pr-4">Sent</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Output</th>
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
          balances={referral.balances}
          defaultMode={referral.mode}
          onClose={() => setShowCreatePayout(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

/**
 * Outstanding (unpaid) commission, per currency and as one millisat total.
 *
 * The payout threshold is judged on everything owed valued in sats, not on each
 * currency separately, so the total is the number that decides whether the next
 * payout run pays this referrer — it is shown next to the threshold rather than
 * left for an admin to work out from gross earnings minus the payout list.
 */
function OutstandingCard({ referral }: { referral: AdminReferralDetail }) {
  const total = referral.outstanding_total_msat;
  const thresholdMsat = referral.payout_threshold != null ? referral.payout_threshold * 1000 : null;
  const clears = thresholdMsat == null ? null : total >= thresholdMsat;
  // A balance we could not price is missing from the total, so say so rather
  // than let the total read as the whole story.
  const unvalued = referral.balances.filter((b) => b.outstanding > 0 && b.outstanding_msat == null);

  return (
    <Card title="Outstanding Balance" icon={<ScaleIcon className="h-5 w-5" />} className="lg:col-span-2">
      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <div className="text-xs text-slate-400">Owed across all currencies</div>
        <div className="mt-1 font-mono text-2xl font-semibold text-amber-300">{formatCurrency(total, "BTC")}</div>
        <div className="mt-1 text-[11px] text-slate-500">
          Fiat balances valued at current rates. This is the figure the payout threshold is judged against.
        </div>
        <div className="mt-2 text-xs">
          {thresholdMsat == null ? (
            <span className="text-slate-400">
              No referrer threshold set — the system minimum applies to this total.
            </span>
          ) : clears ? (
            <span className="text-green-400">
              Clears the {referral.payout_threshold?.toLocaleString()} sats threshold (the system minimum still
              applies).
            </span>
          ) : (
            <span className="text-slate-400">
              {formatCurrency(thresholdMsat - total, "BTC")} short of the {referral.payout_threshold?.toLocaleString()}{" "}
              sats threshold.
            </span>
          )}
        </div>
      </div>

      {referral.balances.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing earned yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-1 pr-3">Currency</th>
                <th className="py-1 pr-3 text-right">Earned</th>
                <th className="py-1 pr-3 text-right">Paid / reserved</th>
                <th className="py-1 pr-3 text-right">Outstanding</th>
                <th className="py-1 text-right">≈ sats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {referral.balances.map((b) => (
                <BalanceRow key={b.currency} balance={b} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unvalued.length > 0 && (
        <p className="mt-2 text-xs text-amber-400">
          No rate available for {unvalued.map((b) => b.currency).join(", ")} — excluded from the total.
        </p>
      )}
    </Card>
  );
}

function BalanceRow({ balance }: { balance: AdminReferralBalance }) {
  return (
    <tr>
      <td className="py-1.5 pr-3 text-slate-400">{balance.currency}</td>
      <td className="py-1.5 pr-3 text-right font-mono text-slate-300">
        {formatCurrency(balance.earned, balance.currency)}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-slate-500">
        {formatCurrency(balance.settled, balance.currency)}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-slate-100">
        {formatCurrency(balance.outstanding, balance.currency)}
      </td>
      <td className="py-1.5 text-right font-mono text-xs text-slate-400">
        {balance.outstanding_msat == null ? (
          <span className="text-amber-400">no rate</span>
        ) : (
          formatCurrency(balance.outstanding_msat, "BTC")
        )}
      </td>
    </tr>
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
  // A converted payout discharges one currency and sends another; showing only
  // the settled side hides what actually left the wallet, and the rate is the
  // only thing that reconciles the two later.
  const converted = payout.sent_currency !== payout.currency;

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
      <td className="py-2 pr-4 font-mono text-slate-100">
        {formatCurrency(payout.amount, payout.currency)}
        {payout.fee > 0 && (
          <div className="text-[11px] text-slate-500">+{formatCurrency(payout.fee, payout.currency)} fee</div>
        )}
      </td>
      <td className="py-2 pr-4 font-mono">
        {converted ? (
          <>
            <div className="text-slate-100">{formatCurrency(payout.sent_amount, payout.sent_currency)}</div>
            <div className="text-[11px] text-slate-500">
              @ {payout.rate.toLocaleString()} {payout.currency}/{payout.sent_currency}
              {payout.sent_fee > 0 && <> · {formatCurrency(payout.sent_fee, payout.sent_currency)} fee</>}
            </div>
            {payout.rate_collected && (
              <div className="text-[11px] text-slate-600">
                quoted {new Date(payout.rate_collected).toLocaleString()}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-500">same currency</span>
        )}
      </td>
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
        {payout.output ? (
          payout.mode === "on_chain" ? (
            <a
              href={`https://mempool.space/tx/${payout.output.split(":")[0]}`}
              target="_blank"
              rel="noreferrer"
              title={payout.output}
              className="text-blue-400 hover:underline"
            >
              {payout.output.slice(0, 18)}… ↗
            </a>
          ) : (
            <span title={payout.output}>{payout.output.slice(0, 18)}…</span>
          )
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
  const [useSystemMinimum, setUseSystemMinimum] = useState(referral.payout_threshold == null);
  const [threshold, setThreshold] = useState(
    referral.payout_threshold != null ? String(referral.payout_threshold) : "",
  );
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
    let thresholdValue: number | null = null;
    if (!useSystemMinimum) {
      const parsed = parseInt(threshold, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Payout threshold must be a whole number of sats >= 0");
        return;
      }
      thresholdValue = parsed;
    }
    const updates: { referral_rate: number | null; code?: string; payout_threshold: number | null } = {
      referral_rate: value,
      payout_threshold: thresholdValue,
    };
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
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={useSystemMinimum} onChange={(e) => setUseSystemMinimum(e.target.checked)} />
          Use system minimum payout threshold
        </label>
        {!useSystemMinimum && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Payout Threshold (sats)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Judged against the referrer's <em>total</em> outstanding commission across every currency, valued in sats.
              The effective threshold is the larger of this and the system minimum.
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

/** One standard unit (BTC, EUR…) expressed in that currency's smallest unit. */
function smallestUnitsPerStandardUnit(currency: string): number {
  // BTC amounts are millisats (1 BTC = 100,000,000 sats = 1e11 msat); fiat is cents.
  return currency === "BTC" ? 1e11 : 100;
}

/**
 * The rate the two entered amounts imply: settled standard units per one sent
 * standard unit, which is exactly what the API stores and cross-checks.
 *
 * Returns null when either side is empty, so nothing is suggested from a
 * half-filled form.
 */
export function impliedPayoutRate(
  amount: number,
  currency: string,
  sentAmount: number,
  sentCurrency: string,
): number | null {
  if (amount <= 0 || sentAmount <= 0 || currency === sentCurrency) {
    return null;
  }
  const settled = amount / smallestUnitsPerStandardUnit(currency);
  const sent = sentAmount / smallestUnitsPerStandardUnit(sentCurrency);
  return settled / sent;
}

function CreatePayoutModal({
  referralId,
  balances,
  defaultMode,
  onClose,
  onSuccess,
}: {
  referralId: number;
  balances: AdminReferralBalance[];
  defaultMode: ReferralMode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const api = useAdminApi();
  const { success } = useToast();
  // Default to the largest outstanding balance: that is the one an admin is
  // almost always here to settle.
  const owed = [...balances].filter((b) => b.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
  const initial = owed[0];
  const [amount, setAmount] = useState(initial?.outstanding ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? "BTC");
  const [fee, setFee] = useState(0);
  const [converted, setConverted] = useState(false);
  const [sentCurrency, setSentCurrency] = useState("BTC");
  const [sentAmount, setSentAmount] = useState(0);
  const [sentFee, setSentFee] = useState(0);
  const [rate, setRate] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<ReferralMode>(defaultMode === "account_credit" ? "lightning_address" : defaultMode);
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = balances.find((b) => b.currency === currency);
  // The rate the API stores is settled units per one sent unit; showing what the
  // entered pair implies lets an admin catch a typo before it is written into a
  // record that has to reconcile against the transfer later.
  const impliedRate = impliedPayoutRate(amount, currency, sentAmount, sentCurrency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    let conversion: { sent_currency: string; sent_amount: number; sent_fee: number; rate: number } | undefined;
    if (converted) {
      if (sentCurrency === currency) {
        setError("Sent currency must differ from the settled currency");
        return;
      }
      if (sentAmount <= 0) {
        setError("Sent amount must be greater than 0");
        return;
      }
      const parsedRate = parseFloat(rate);
      if (Number.isNaN(parsedRate) || parsedRate <= 0) {
        setError(`Rate must be a number > 0 (${currency} per 1 ${sentCurrency})`);
        return;
      }
      conversion = {
        sent_currency: sentCurrency,
        sent_amount: sentAmount,
        sent_fee: sentFee,
        rate: parsedRate,
      };
    }
    setSubmitting(true);
    try {
      await api.createReferralPayout(referralId, {
        amount,
        currency,
        fee: fee > 0 ? fee : undefined,
        ...conversion,
        output: output.trim() || undefined,
        mode,
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
              Settled amount ({currency === "BTC" ? "sats" : currency})
            </label>
            <MoneyAmountInput
              value={amount}
              currency={currency}
              onChange={setAmount}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Comes off the referrer's balance in this currency.</p>
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
            {selected && (
              <p className="mt-1 text-xs text-slate-500">
                Outstanding: {formatCurrency(selected.outstanding, selected.currency)}
                {selected.outstanding_msat != null && selected.currency !== "BTC" && (
                  <> (≈ {formatCurrency(selected.outstanding_msat, "BTC")})</>
                )}
                <button
                  type="button"
                  className="ml-2 text-blue-400 hover:underline"
                  onClick={() => setAmount(selected.outstanding)}
                >
                  use full
                </button>
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Fee charged to the referrer ({currency === "BTC" ? "sats" : currency})
          </label>
          <MoneyAmountInput
            value={fee}
            currency={currency}
            onChange={setFee}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-500">
            Debited from the balance alongside the amount. Leave at 0 if you absorbed the fee.
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={converted} onChange={(e) => setConverted(e.target.checked)} />
            Paid in a different currency (converted payout)
          </label>
          {converted ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Sent amount ({sentCurrency === "BTC" ? "sats" : sentCurrency})
                  </label>
                  <MoneyAmountInput
                    value={sentAmount}
                    currency={sentCurrency}
                    onChange={setSentAmount}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Sent currency</label>
                  <input
                    type="text"
                    value={sentCurrency}
                    onChange={(e) => setSentCurrency(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Network fee ({sentCurrency === "BTC" ? "sats" : sentCurrency})
                  </label>
                  <MoneyAmountInput
                    value={sentFee}
                    currency={sentCurrency}
                    onChange={setSentFee}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Rate ({currency} per 1 {sentCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder={impliedRate ? impliedRate.toFixed(2) : ""}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
                    required
                  />
                  {impliedRate != null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Amounts imply {impliedRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <button
                        type="button"
                        className="ml-2 text-blue-400 hover:underline"
                        onClick={() => setRate(String(impliedRate))}
                      >
                        use
                      </button>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The record keeps both sides: {formatCurrency(amount, currency)} discharged,{" "}
                {formatCurrency(sentAmount, sentCurrency)} sent. The rate is what reconciles them later, so it must
                agree with the amounts.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Sent side mirrors the settled side: {formatCurrency(amount, currency)} in {currency}.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ReferralMode)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="lightning_address">Lightning Address</option>
            <option value="nwc">Nostr Wallet Connect</option>
            <option value="on_chain">On-Chain</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Output (Optional)</label>
          <input
            type="text"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder={mode === "on_chain" ? "<txid>:<vout>" : "lnbc..."}
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
