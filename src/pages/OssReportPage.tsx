import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  GlobeEuropeAfricaIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Table } from "../components/Table";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedCompanies } from "../hooks/useCachedCompanies";
import type { OssReportData, OssReportPeriod, OssReportRow } from "../lib/api";
import { formatCurrency } from "../utils/currency";

export function OssReportPage() {
  const api = useAdminApi();
  const { data: companies } = useCachedCompanies();

  const [reportData, setReportData] = useState<OssReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const now = new Date();
  const [year, setYear] = useState(() => now.getFullYear());
  const [period, setPeriod] = useState<OssReportPeriod>("quarter");
  // Selected bucket: 1-4 for quarters, 1-6 for bimonthly
  const [bucket, setBucket] = useState<number>(() => Math.floor(now.getMonth() / 3) + 1);
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Derive the exact calendar date range for the selected filing period
  const getDateRange = (): { startDate: string; endDate: string } => {
    const monthsPerPeriod = period === "quarter" ? 3 : 2;
    const startMonth = (bucket - 1) * monthsPerPeriod;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + monthsPerPeriod, 0);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { startDate: fmt(start), endDate: fmt(end) };
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();
      const data = await api.getOssReport({
        start_date: startDate,
        end_date: endDate,
        period,
        ...(companyId ? { company_id: companyId } : {}),
      });
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OSS VAT report");
    } finally {
      setLoading(false);
    }
  };

  // Initial load once on mount
  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    if (!reportData) return;
    const headers = [
      "Period",
      "Company",
      "Destination Country",
      "VAT Rate (%)",
      "Currency",
      "Net Total",
      "Tax Total",
      "Transactions",
    ];
    const rows = reportData.rows.map((r) => {
      const divisor = r.currency === "BTC" ? 1e11 : 100;
      const digits = r.currency === "BTC" ? 8 : 2;
      return [
        r.period,
        r.company_name,
        r.country_code,
        r.vat_rate.toString(),
        r.currency,
        (r.net_total / divisor).toFixed(digits),
        (r.tax_total / divisor).toFixed(digits),
        r.transaction_count.toString(),
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `oss-vat-${reportData.start_date}-to-${reportData.end_date}.csv`;
    link.click();
  };

  const columns = [
    { header: "Period", key: "period" },
    { header: "Company", key: "company_name" },
    {
      header: "Destination",
      key: "country_code",
      render: (item: OssReportRow) => <span className="font-mono">{item.country_code}</span>,
    },
    {
      header: "VAT Rate",
      key: "vat_rate",
      render: (item: OssReportRow) => <span className="text-yellow-400">{item.vat_rate}%</span>,
    },
    {
      header: "Net",
      key: "net_total",
      render: (item: OssReportRow) => (
        <span className="text-green-400">{formatCurrency(item.net_total, item.currency)}</span>
      ),
    },
    {
      header: "VAT",
      key: "tax_total",
      render: (item: OssReportRow) => (
        <span className="text-red-400">{formatCurrency(item.tax_total, item.currency)}</span>
      ),
    },
    {
      header: "Transactions",
      key: "transaction_count",
      render: (item: OssReportRow) => <span className="text-slate-300">{item.transaction_count}</span>,
    },
  ];

  const totalTransactions = reportData?.rows.reduce((acc, r) => acc + r.transaction_count, 0) ?? 0;
  const countryCount = new Set(reportData?.rows.map((r) => r.country_code)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlobeEuropeAfricaIcon className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">OSS VAT Report</h1>
            <p className="text-sm text-slate-400">Cross-border EU B2C sales for the One-Stop Shop return</p>
          </div>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
            <input
              type="number"
              min={2020}
              max={now.getFullYear()}
              value={year}
              onChange={(e) => setYear(Number.parseInt(e.target.value, 10) || now.getFullYear())}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Filing Period</label>
            <select
              value={period}
              onChange={(e) => {
                const p = e.target.value as OssReportPeriod;
                setPeriod(p);
                // Clamp bucket to the new period's range
                setBucket((b) => Math.min(b, p === "quarter" ? 4 : 6));
              }}
            >
              <option value="quarter">Quarterly (Q1-Q4)</option>
              <option value="bimonthly">Bi-monthly (B1-B6)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {period === "quarter" ? "Quarter" : "Bi-monthly Period"}
            </label>
            <select value={bucket} onChange={(e) => setBucket(Number.parseInt(e.target.value, 10))}>
              {period === "quarter" ? (
                <>
                  <option value={1}>Q1 (Jan-Mar)</option>
                  <option value={2}>Q2 (Apr-Jun)</option>
                  <option value={3}>Q3 (Jul-Sep)</option>
                  <option value={4}>Q4 (Oct-Dec)</option>
                </>
              ) : (
                <>
                  <option value={1}>B1 (Jan-Feb)</option>
                  <option value={2}>B2 (Mar-Apr)</option>
                  <option value={3}>B3 (May-Jun)</option>
                  <option value={4}>B4 (Jul-Aug)</option>
                  <option value={5}>B5 (Sep-Oct)</option>
                  <option value={6}>B6 (Nov-Dec)</option>
                </>
              )}
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
            <span className="ml-3 text-gray-300">Loading OSS VAT data...</span>
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
      {reportData && !loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-gray-400 text-sm">Rows</p>
              <p className="text-white font-semibold text-xl">{reportData.rows.length}</p>
              <p className="text-blue-400 text-sm">period × country × rate</p>
            </Card>
            <Card>
              <p className="text-gray-400 text-sm">Destination Countries</p>
              <p className="text-white font-semibold text-xl">{countryCount}</p>
              <p className="text-blue-400 text-sm">EU member states</p>
            </Card>
            <Card>
              <p className="text-gray-400 text-sm">Transactions</p>
              <p className="text-white font-semibold text-xl">{totalTransactions}</p>
              <p className="text-blue-400 text-sm">paid B2C sales</p>
            </Card>
          </div>

          <Card title="OSS Breakdown">
            {reportData.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No cross-border EU B2C (oss_b2c) sales in the selected period.
              </p>
            ) : (
              <Table columns={columns} data={reportData.rows.map((r, i) => ({ ...r, id: i }))} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
