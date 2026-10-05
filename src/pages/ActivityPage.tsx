import {
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
  CubeIcon,
  ServerIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Pill } from "../components/Pill";
import { Profile } from "../components/Profile";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import {
  type ActivityPaymentTotal,
  type ActivityReport,
  type ActivitySection,
  paymentSign,
  SubscriptionPaymentType,
} from "../lib/api";
import { formatCurrency } from "../utils/currency";
import { formatRelative } from "../utils/relativeTime";

const WINDOW_OPTIONS = [1, 7, 30, 90];
const EXPIRING_OPTIONS = [3, 7, 14, 30];
const LIST_LIMIT = 25;
const HOUR_MS = 3_600_000;

const PAYMENT_TYPE_VARIANT: Record<SubscriptionPaymentType, "success" | "primary" | "secondary" | "danger"> = {
  [SubscriptionPaymentType.PURCHASE]: "success",
  [SubscriptionPaymentType.RENEWAL]: "primary",
  [SubscriptionPaymentType.UPGRADE]: "secondary",
  [SubscriptionPaymentType.REFUND]: "danger",
};

function netByCurrency(totals: ActivityPaymentTotal[]): [string, number][] {
  const net = new Map<string, number>();
  for (const t of totals) {
    net.set(t.currency, (net.get(t.currency) ?? 0) + paymentSign(t.payment_type) * t.amount);
  }
  return [...net.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function When({ at, className }: { at: string; className?: string }) {
  return (
    <span className={clsx("whitespace-nowrap", className ?? "text-slate-400")} title={new Date(at).toLocaleString()}>
      {formatRelative(at)}
    </span>
  );
}

function UserLink({ id }: { id: number }) {
  return (
    <Link to={`/users/${id}`} className="text-blue-400 hover:text-blue-300">
      #{id}
    </Link>
  );
}

function VmLink({ id, plan }: { id: number; plan: string }) {
  return (
    <div className="min-w-0">
      <Link to={`/vms/${id}`} className="font-semibold text-blue-400 hover:text-blue-300">
        VM #{id}
      </Link>
      <div className="truncate text-xs text-slate-400">{plan}</div>
    </div>
  );
}

interface TileProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href: string;
  tone?: string;
}

function Tile({ label, value, icon: Icon, href, tone = "text-white" }: TileProps) {
  return (
    <a
      href={href}
      className="group rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 transition-colors hover:border-slate-500"
    >
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
        <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
      </div>
      <div className={clsx("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</div>
    </a>
  );
}

interface ActivityCardProps<T> {
  id: string;
  title: string;
  icon: React.ElementType;
  section: ActivitySection<T>;
  viewAll?: string;
  empty: string;
  headers: string[];
  renderRow: (item: T) => React.ReactNode;
  className?: string;
}

function ActivityCard<T>({
  id,
  title,
  icon: Icon,
  section,
  viewAll,
  empty,
  headers,
  renderRow,
  className,
}: ActivityCardProps<T>) {
  return (
    <div id={id} className={clsx("scroll-mt-6", className)}>
      <Card
        title={`${title} (${section.total})`}
        icon={<Icon className="h-5 w-5" />}
        actions={
          viewAll && (
            <Link to={viewAll} className="text-sm text-blue-400 hover:text-blue-300">
              View all
            </Link>
          )
        }
        className="h-full"
      >
        {section.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
        ) : (
          <div className="-mx-4 -my-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/70 [&_td]:px-4 [&_td]:py-2 [&_td]:align-middle [&_td:last-child]:text-right">
                {section.items.map(renderRow)}
              </tbody>
            </table>
            {section.total > section.items.length && (
              <p className="border-t border-slate-700 px-4 py-2 text-xs text-slate-500">
                Showing {section.items.length} of {section.total}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export function ActivityPage() {
  const api = useAdminApi();
  const [days, setDays] = useState(7);
  const [expiringDays, setExpiringDays] = useState(7);
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.getActivityReport({ days, expiring_days: expiringDays, limit: LIST_LIMIT }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load activity"));
    } finally {
      setLoading(false);
    }
  }, [api, days, expiringDays]);

  useEffect(() => {
    load();
  }, [load]);

  const windowLabel = days === 1 ? "24 hours" : `${days} days`;
  const now = Date.now();
  const net = report ? netByCurrency(report.payment_totals) : [];
  const refunds = report?.payment_totals.filter((t) => t.payment_type === SubscriptionPaymentType.REFUND) ?? [];

  const select = (id: string, label: string, value: number, options: number[], onChange: (v: number) => void) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-gray-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 1 ? "24 hours" : `${o} days`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <StatsHeader
        title="Activity"
        subtitle={`Orders, cancellations, expiries and payments over the last ${windowLabel}`}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            {select("activity-window", "Look back", days, WINDOW_OPTIONS, setDays)}
            {select("activity-expiring", "Expiring within", expiringDays, EXPIRING_OPTIONS, setExpiringDays)}
            <Button
              variant="secondary"
              onClick={load}
              isLoading={loading}
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorState error={error} onRetry={load} action="view activity" />}

      {!report && loading && (
        <div className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-4">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="h-20 rounded-lg bg-slate-800" />
          ))}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile
              label="Net revenue"
              icon={BanknotesIcon}
              href="#activity-payments"
              tone="text-green-400"
              value={
                net.length === 0 ? (
                  <span className="text-slate-500">0</span>
                ) : (
                  <div className="space-y-0.5">
                    {net.map(([currency, amount]) => (
                      <div key={currency} className={clsx("text-lg leading-tight", amount < 0 && "text-red-400")}>
                        {formatCurrency(amount, currency)}
                      </div>
                    ))}
                    {refunds.map((r) => (
                      <div key={`refund-${r.currency}`} className="text-xs font-normal text-slate-400">
                        after {formatCurrency(r.amount, r.currency)} refunded
                      </div>
                    ))}
                  </div>
                )
              }
            />
            <Tile label="Payments" icon={BanknotesIcon} href="#activity-payments" value={report.payments.total} />
            <Tile label="New VMs" icon={ServerIcon} href="#activity-new-vms" value={report.new_vms.total} />
            <Tile
              label="Deleted VMs"
              icon={TrashIcon}
              href="#activity-deleted-vms"
              value={report.deleted_vms.total}
              tone={report.deleted_vms.total > 0 ? "text-red-400" : "text-white"}
            />
            <Tile
              label="Expiring VMs"
              icon={ClockIcon}
              href="#activity-expiring-vms"
              value={report.expiring_vms.total}
              tone={report.expiring_vms.total > 0 ? "text-amber-400" : "text-white"}
            />
            <Tile
              label="VPN plans"
              icon={ShieldCheckIcon}
              href="#activity-vpn"
              value={report.new_vpn_subscriptions.total}
            />
            <Tile label="App orders" icon={CubeIcon} href="#activity-apps" value={report.new_app_deployments.total} />
            <Tile label="New users" icon={UserPlusIcon} href="#activity-users" value={report.new_users.total} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ActivityCard
              id="activity-payments"
              className="xl:col-span-2"
              title="Payments"
              icon={BanknotesIcon}
              section={report.payments}
              viewAll="/subscriptions"
              empty={`No payments in the last ${windowLabel}`}
              headers={["Paid", "Subscription", "User", "Type", "Method", "Amount"]}
              renderRow={(p) => {
                const isRefund = p.payment_type === SubscriptionPaymentType.REFUND;
                return (
                  <tr key={p.id}>
                    <td>
                      <When at={p.paid_at ?? p.created} />
                    </td>
                    <td>
                      <Link to={`/subscriptions/${p.subscription_id}`} className="text-blue-400 hover:text-blue-300">
                        {p.subscription_name}
                      </Link>
                    </td>
                    <td>
                      <UserLink id={p.user_id} />
                    </td>
                    <td>
                      <Pill variant={PAYMENT_TYPE_VARIANT[p.payment_type] ?? "default"}>{p.payment_type}</Pill>
                    </td>
                    <td className="text-slate-300">{p.payment_method}</td>
                    <td className={clsx("whitespace-nowrap font-mono", isRefund ? "text-red-400" : "text-slate-100")}>
                      {isRefund && "-"}
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                  </tr>
                );
              }}
            />

            <ActivityCard
              id="activity-new-vms"
              title="New VMs"
              icon={ServerIcon}
              section={report.new_vms}
              viewAll="/vms"
              empty={`No paid VM orders in the last ${windowLabel}`}
              headers={["VM", "Region", "User", "Ordered"]}
              renderRow={(vm) => (
                <tr key={vm.id}>
                  <td>
                    <VmLink id={vm.id} plan={vm.template_name} />
                  </td>
                  <td className="text-slate-300">{vm.region_name}</td>
                  <td>
                    <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
                  </td>
                  <td>
                    {vm.deleted && (
                      <Pill variant="danger" className="mr-2">
                        deleted
                      </Pill>
                    )}
                    <When at={vm.created} />
                  </td>
                </tr>
              )}
            />

            <ActivityCard
              id="activity-expiring-vms"
              title="Expiring VMs"
              icon={ClockIcon}
              section={report.expiring_vms}
              viewAll="/renewals-report"
              empty={`No VMs expire in the next ${expiringDays} days`}
              headers={["VM", "User", "Renewal", "Expires"]}
              renderRow={(vm) => {
                const expiresMs = vm.expires ? Date.parse(vm.expires) : now;
                const tone =
                  expiresMs < now
                    ? "text-red-400"
                    : expiresMs - now < 48 * HOUR_MS
                      ? "text-amber-400"
                      : "text-slate-300";
                return (
                  <tr key={vm.id}>
                    <td>
                      <VmLink id={vm.id} plan={vm.template_name} />
                    </td>
                    <td>
                      <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
                    </td>
                    <td>
                      {vm.auto_renewal_enabled ? (
                        <Pill variant="success">auto</Pill>
                      ) : (
                        <Pill variant="warning">manual</Pill>
                      )}
                    </td>
                    <td>{vm.expires && <When at={vm.expires} className={tone} />}</td>
                  </tr>
                );
              }}
            />

            <ActivityCard
              id="activity-deleted-vms"
              title="Deleted VMs"
              icon={TrashIcon}
              section={report.deleted_vms}
              empty={`No paid VMs were deleted in the last ${windowLabel}`}
              headers={["VM", "User", "Reason", "Deleted"]}
              renderRow={(vm) => (
                <tr key={vm.id}>
                  <td>
                    <VmLink id={vm.id} plan={vm.template_name} />
                  </td>
                  <td>
                    <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
                  </td>
                  <td className="text-slate-300">
                    <div className="line-clamp-2 max-w-[12rem] text-xs" title={vm.delete_reason ?? undefined}>
                      {vm.delete_reason ?? <span className="text-slate-500">none given</span>}
                    </div>
                  </td>
                  <td>
                    <When at={vm.deleted_at} />
                  </td>
                </tr>
              )}
            />

            <ActivityCard
              id="activity-vpn"
              title="New VPN plans"
              icon={ShieldCheckIcon}
              section={report.new_vpn_subscriptions}
              viewAll="/vpn-subscriptions"
              empty={`No VPN plans bought in the last ${windowLabel}`}
              headers={["Plan", "User", "Devices", "Created"]}
              renderRow={(plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link
                      to={`/vpn-subscriptions?user_id=${plan.user_id}`}
                      className="font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {plan.vpn_service_name}
                    </Link>
                    <div className="text-xs text-slate-400">#{plan.id}</div>
                  </td>
                  <td>
                    <UserLink id={plan.user_id} />
                  </td>
                  <td className="tabular-nums text-slate-300">
                    {plan.devices.length} / {plan.device_limit}
                  </td>
                  <td>
                    <When at={plan.created} />
                  </td>
                </tr>
              )}
            />

            <ActivityCard
              id="activity-apps"
              title="New app orders"
              icon={CubeIcon}
              section={report.new_app_deployments}
              viewAll="/app-deployments"
              empty={`No app orders in the last ${windowLabel}`}
              headers={["Deployment", "User", "Status", "Created"]}
              renderRow={(d) => (
                <tr key={d.id}>
                  <td>
                    <Link to="/app-deployments" className="font-semibold text-blue-400 hover:text-blue-300">
                      {d.name}
                    </Link>
                    <div className="truncate text-xs text-slate-400">{d.hostname ?? `#${d.id}`}</div>
                  </td>
                  <td>
                    <UserLink id={d.user_id} />
                  </td>
                  <td>
                    <Pill variant={d.status === "running" ? "success" : d.status === "error" ? "danger" : "default"}>
                      {d.status}
                    </Pill>
                  </td>
                  <td>
                    <When at={d.created} />
                  </td>
                </tr>
              )}
            />

            <ActivityCard
              id="activity-users"
              title="New users"
              icon={UserPlusIcon}
              section={report.new_users}
              viewAll="/users"
              empty={`No sign-ups in the last ${windowLabel}`}
              headers={["User", "Account", "Joined"]}
              renderRow={(u) => (
                <tr key={u.id}>
                  <td>
                    <UserLink id={u.id} />
                  </td>
                  <td>
                    <Profile pubkey={u.pubkey} avatarSize="sm" />
                  </td>
                  <td>
                    <When at={u.created} />
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
