import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Table } from "../components/Table";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedCompanies } from "../hooks/useCachedCompanies";
import { useCachedRegions } from "../hooks/useCachedRegions";
import type { ProfitLossPeriod, ProfitLossReportData } from "../lib/api";
import { CURRENCIES, formatCurrency } from "../utils/currency";

export function ProfitLossReportPage() {
  const api = useAdminApi();
  const { data: companies } = useCachedCompanies();
  const { data: regions } = useCachedRegions();

  const [reportData, setReportData] = useState<ProfitLossReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupBy, setGroupBy] = useState<"month" | "year">("month");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("");

  const loadReport = async () => {
    if (!companyId && !currency) {
      setError("Select a company or a target currency (currency is required when reporting across all companies)");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfitLossReport({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
        ...(companyId ? { company_id: companyId } : {}),
        ...(regionId ? { region_id: regionId } : {}),
        ...(currency ? { currency } : {}),
      });
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profit/loss report");
    } finally {
      setLoading(false);
    }
  };

  // Default to first company once loaded, then fetch
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

  const totals = reportData?.periods.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue_net,
      cost: acc.cost + p.cost_total,
      profit: acc.profit + p.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );

  const reportCurrency = reportData?.currency ?? "USD";

  const chartData =
    reportData?.periods.map((p) => ({
      period: p.period,
      revenue: p.revenue_net,
      cost: -p.cost_total,
      profit: p.profit,
    })) ?? [];

  // Recharts defaults the Y domain to [0, 'auto'], clipping loss periods
  // (negative cost bars / profit) at zero. Compute an explicit domain padded
  // symmetrically around zero so negative values are visible.
  const chartValues = chartData.flatMap((d) => [d.revenue, d.cost, d.profit]);
  const rawMin = Math.min(0, ...chartValues);
  const rawMax = Math.max(0, ...chartValues);
  const chartPad = Math.max(Math.abs(rawMin), Math.abs(rawMax)) * 0.1 || 1;
  const yDomain: [number, number] = [rawMin - chartPad, rawMax + chartPad];

  const exportCSV = () => {
    if (!reportData) return;
    const headers = ["Period", "Revenue Net", "Revenue Tax", "Cost Recurring", "Cost One-time", "Cost Total", "Profit"];
    const divisor = reportCurrency === "BTC" ? 1e11 : 100;
    const digits = reportCurrency === "BTC" ? 8 : 2;
    const rows = reportData.periods.map((p) => [
      p.period,
      (p.revenue_net / divisor).toFixed(digits),
      (p.revenue_tax / divisor).toFixed(digits),
      (p.cost_recurring / divisor).toFixed(digits),
      (p.cost_one_time / divisor).toFixed(digits),
      (p.cost_total / divisor).toFixed(digits),
      (p.profit / divisor).toFixed(digits),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `profit-loss-${reportData.start_date}-to-${reportData.end_date}.csv`;
    link.click();
  };

  const columns = [
    { header: "Period", key: "period" },
    {
      header: "Revenue (net)",
      key: "revenue_net",
      render: (item: ProfitLossPeriod) => (
        <span className="text-green-400">{formatCurrency(item.revenue_net, reportCurrency)}</span>
      ),
    },
    {
      header: "Tax",
      key: "revenue_tax",
      render: (item: ProfitLossPeriod) => (
        <span className="text-yellow-400">{formatCurrency(item.revenue_tax, reportCurrency)}</span>
      ),
    },
    {
      header: "Recurring Costs",
      key: "cost_recurring",
      render: (item: ProfitLossPeriod) => (
        <span className="text-orange-400">{formatCurrency(item.cost_recurring, reportCurrency)}</span>
      ),
    },
    {
      header: "One-time Costs",
      key: "cost_one_time",
      render: (item: ProfitLossPeriod) => (
        <span className="text-orange-400">{formatCurrency(item.cost_one_time, reportCurrency)}</span>
      ),
    },
    {
      header: "Total Costs",
      key: "cost_total",
      render: (item: ProfitLossPeriod) => (
        <span className="text-red-400">{formatCurrency(item.cost_total, reportCurrency)}</span>
      ),
    },
    {
      header: "Profit",
      key: "profit",
      render: (item: ProfitLossPeriod) => (
        <span className={item.profit >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
          {formatCurrency(item.profit, reportCurrency)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScaleIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Profit &amp; Loss</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadReport}
            variant="secondary"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {reportData && (
            <Button onClick={exportCSV} variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "month" | "year")}>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
            <select
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
            >
              <option value="">All Companies</option>
              {companies?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
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
              {regions?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Currency {companyId ? "(optional)" : "(required)"}
            </label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">{companyId ? "Company base currency" : "Select currency"}</option>
              {CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
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

      {/* Loading State */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Loading profit/loss data...</span>
          </div>
        </Card>
      )}

      {/* Error State */}
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

      {/* Data Display */}
      {reportData && !loading && !error && totals && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue (net)</p>
                  <p className="text-white font-semibold">{formatCurrency(totals.revenue, reportCurrency)}</p>
                  <p className="text-blue-400 text-sm">{reportData.periods.length} periods</p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Costs</p>
                  <p className="text-white font-semibold">{formatCurrency(totals.cost, reportCurrency)}</p>
                  <p className="text-blue-400 text-sm">recurring + one-time</p>
                </div>
                <BanknotesIcon className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Profit</p>
                  <p className={`font-semibold ${totals.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(totals.profit, reportCurrency)}
                  </p>
                  <p className="text-blue-400 text-sm">{reportCurrency}</p>
                </div>
                {totals.profit >= 0 ? (
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                )}
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card title={`Profit / Loss (${reportCurrency})`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    domain={yDomain}
                    tickFormatter={(value) => formatCurrency(value, reportCurrency) as string}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value, reportCurrency), name]}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#6B7280" />
                  <Bar dataKey="revenue" name="Revenue" stackId="pl" fill="#22C55E" />
                  <Bar dataKey="cost" name="Costs" stackId="pl" fill="#EF4444" />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Period Table */}
          <Card title={`Period Breakdown (${reportCurrency})`}>
            <Table columns={columns} data={reportData.periods.map((p) => ({ ...p, id: p.period }))} />
          </Card>
        </>
      )}
    </div>
  );
}
