import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Table } from "../components/Table";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedCompanies } from "../hooks/useCachedCompanies";
import { useCachedRegions } from "../hooks/useCachedRegions";
import type { RenewalsPeriod, RenewalsReportData } from "../lib/api";

export function RenewalsReportPage() {
  const api = useAdminApi();
  const { data: companies } = useCachedCompanies();
  const { data: regions } = useCachedRegions();

  const [reportData, setReportData] = useState<RenewalsReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default window: 3 months back for churn history, 6 forward for the outlook.
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  });
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);

  const loadReport = async () => {
    if (!companyId) {
      setError("Select a company");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRenewalsReport({
        start_date: startDate,
        end_date: endDate,
        company_id: companyId,
        ...(regionId ? { region_id: regionId } : {}),
      });
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load renewals report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companies?.length && companyId === null) {
      setCompanyId(companies[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  useEffect(() => {
    if (companyId) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const periods = reportData?.periods ?? [];
  // `complete` comes from the server, which owns the notion of "this month".
  const upcoming = periods.filter((p) => !p.complete);
  const complete = periods.filter((p) => p.complete);

  const totals = {
    due: upcoming.reduce((a, p) => a + p.due, 0),
    autoCapable: upcoming.reduce((a, p) => a + p.due_auto_capable, 0),
    // The dangerous bucket: the subscription says auto-renew, but there is no
    // saved payment method for the worker to charge.
    atRisk: upcoming.reduce((a, p) => a + p.due_auto_without_method + p.due_manual, 0),
    lapsed: complete.reduce((a, p) => a + p.lapsed, 0),
    renewedSubs: complete.reduce((a, p) => a + p.renewed_subscriptions, 0),
  };
  // Blended churn over the completed months, on the same basis as the per-month
  // rate: subscriptions that faced a renewal decision, and the share lost.
  const decided = totals.lapsed + totals.renewedSubs;
  const churnRate = decided > 0 ? (totals.lapsed / decided) * 100 : null;

  const chartData = [...periods]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({
      period: p.period,
      "Auto-capable": p.due_auto_capable,
      "Auto, no method": p.due_auto_without_method,
      Manual: p.due_manual,
      Renewed: p.renewed_subscriptions,
      Churned: p.lapsed,
    }));

  const exportCSV = () => {
    if (!reportData) return;
    const headers = [
      "Period",
      "Due",
      "Due auto-capable",
      "Due auto without method",
      "Due manual",
      "Lapsed",
      "Lapsed never paid",
      "Renewed subscriptions",
      "Churn rate %",
      "Renewed payments",
      "Renewed auto",
      "Renewed manual",
      "Renewed unknown",
    ];
    const rows = reportData.periods.map((p) => [
      p.period,
      p.due,
      p.due_auto_capable,
      p.due_auto_without_method,
      p.due_manual,
      p.lapsed,
      p.lapsed_never_paid,
      p.renewed_subscriptions,
      p.churn_rate?.toFixed(1) ?? "",
      p.renewed,
      p.renewed_auto,
      p.renewed_manual,
      p.renewed_unknown,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = `renewals-${reportData.start_date}-to-${reportData.end_date}.csv`;
    link.click();
  };

  const trackingSince = reportData?.source_tracking_since ?? null;

  const columns = [
    {
      header: "Period",
      key: "period",
      render: (p: RenewalsPeriod) => <span className={p.complete ? "text-gray-400" : "text-white"}>{p.period}</span>,
    },
    { header: "Due", key: "due", render: (p: RenewalsPeriod) => <span className="text-white">{p.due}</span> },
    {
      header: "Auto-capable",
      key: "due_auto_capable",
      render: (p: RenewalsPeriod) => <span className="text-green-400">{p.due_auto_capable}</span>,
    },
    {
      header: "Auto, no method",
      key: "due_auto_without_method",
      render: (p: RenewalsPeriod) => (
        <span className={p.due_auto_without_method > 0 ? "text-yellow-400 font-semibold" : "text-gray-500"}>
          {p.due_auto_without_method}
        </span>
      ),
    },
    {
      header: "Manual",
      key: "due_manual",
      render: (p: RenewalsPeriod) => <span className="text-orange-400">{p.due_manual}</span>,
    },
    {
      header: "Renewed",
      key: "renewed_subscriptions",
      render: (p: RenewalsPeriod) => (
        <span className="text-blue-400" title={`${p.renewed} renewal payments`}>
          {p.renewed_subscriptions}
        </span>
      ),
    },
    {
      header: "Auto",
      key: "renewed_auto",
      render: (p: RenewalsPeriod) => <span className="text-green-400">{p.renewed_auto}</span>,
    },
    {
      header: "Manual",
      key: "renewed_manual",
      render: (p: RenewalsPeriod) => <span className="text-orange-400">{p.renewed_manual}</span>,
    },
    {
      header: "Unknown",
      key: "renewed_unknown",
      render: (p: RenewalsPeriod) => <span className="text-slate-500">{p.renewed_unknown}</span>,
    },
    {
      header: "Churned",
      key: "lapsed",
      render: (p: RenewalsPeriod) =>
        p.complete ? (
          <span className={p.lapsed > 0 ? "text-red-400 font-semibold" : "text-gray-500"}>{p.lapsed}</span>
        ) : (
          // An expiry that has not arrived is not a loss.
          <span className="text-gray-600" title="Month not finished">
            —
          </span>
        ),
    },
    {
      header: "Churn %",
      key: "churn_rate",
      render: (p: RenewalsPeriod) =>
        p.churn_rate === null ? (
          <span className="text-gray-600">—</span>
        ) : (
          <span className={p.churn_rate >= 20 ? "text-red-400 font-semibold" : "text-green-400"}>
            {p.churn_rate.toFixed(1)}%
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUturnLeftIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Renewals &amp; Churn</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReport} variant="secondary" size="sm" disabled={loading} className="flex gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {reportData && (
            <Button onClick={exportCSV} variant="secondary" size="sm" className="flex gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
            <select
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
            >
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
            <select
              value={regionId ?? ""}
              onChange={(e) => setRegionId(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
            >
              <option value="">All Regions</option>
              {regions?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end lg:col-start-4">
            <Button onClick={loadReport} variant="primary" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Load Report"}
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Loading renewals data...</span>
          </div>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <div className="flex items-center justify-center py-8 text-red-400">
            <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="font-semibold">Failed to load report</div>
              <div className="text-sm text-red-300 mt-1">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {reportData && !loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Due to renew</p>
                  <p className="text-white font-semibold text-xl">{totals.due}</p>
                  <p className="text-blue-400 text-sm">upcoming periods</p>
                </div>
                <ArrowPathIcon className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Will auto-renew</p>
                  <p className="text-green-400 font-semibold text-xl">{totals.autoCapable}</p>
                  <p className="text-blue-400 text-sm">
                    {totals.due > 0 ? `${Math.round((totals.autoCapable / totals.due) * 100)}% of due` : "—"}
                  </p>
                </div>
                <ShieldCheckIcon className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Needs the customer</p>
                  <p className="text-yellow-400 font-semibold text-xl">{totals.atRisk}</p>
                  <p className="text-blue-400 text-sm">manual, or auto with no method</p>
                </div>
                <UserIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Churned</p>
                  <p className="text-red-400 font-semibold text-xl">{totals.lapsed}</p>
                  <p className="text-blue-400 text-sm">
                    {churnRate === null ? "completed periods" : `${churnRate.toFixed(1)}% of renewal decisions`}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            </Card>
          </div>

          <Card title="Due vs renewed by month">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Auto-capable" stackId="due" fill="#22C55E" />
                  <Bar dataKey="Auto, no method" stackId="due" fill="#EAB308" />
                  <Bar dataKey="Manual" stackId="due" fill="#F97316" />
                  <Line
                    type="monotone"
                    dataKey="Renewed"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Churned"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: "#EF4444", r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Monthly breakdown">
            <Table columns={columns} data={periods.map((p) => ({ ...p, id: p.period }))} />
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <p>
                Counted per subscription, not per VM. <span className="text-green-400">Auto-capable</span> is the only
                bucket the worker will actually charge — it needs auto-renewal enabled <em>and</em> a saved payment
                method. <span className="text-yellow-400">Auto, no method</span> looks safe on the subscription record
                but falls through to a manual expiry warning.
              </p>
              <p>
                A subscription&apos;s expiry moves forward when it renews, so one still sitting in a finished month
                never came back — that is the churn. The current and future months show{" "}
                <span className="text-gray-300">—</span>: an expiry that has not arrived yet is not a loss. Churn % is
                lapsed ÷ (lapsed + subscriptions renewed) for that month; abandoned signups that never paid are excluded
                from both.
              </p>
              {trackingSince && (
                <p>
                  Renewal source is only recorded from <span className="text-white">{trackingSince}</span>; earlier
                  renewals count as <span className="text-slate-300">Unknown</span> rather than being guessed either
                  way.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
