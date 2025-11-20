import { useState, useEffect } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Table } from "../components/Table";
import { useAdminApi } from "../hooks/useAdminApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  ReferralUsageTimeSeriesReportData,
  ReferralPeriodSummary,
  ReferralRecord,
  AdminCompanyInfo,
} from "../lib/api";
import { formatCurrency } from "../utils/currency";

const INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

export function ReferralsReportPage() {
  const [reportData, setReportData] =
    useState<ReferralUsageTimeSeriesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Form state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12); // Default to last 12 months
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [interval, setInterval] = useState<
    "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [refCode, setRefCode] = useState<string>("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [refSplitPercent, setRefSplitPercent] = useState<number>(33);

  const api = useAdminApi();

  const loadCompanies = async () => {
    try {
      setCompaniesLoading(true);
      const result = await api.getCompanies({ limit: 100 });
      setCompanies(result.data);

      // Set first company as default if available
      if (result.data.length > 0 && companyId === null) {
        setCompanyId(result.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const loadReferralData = async () => {
    if (!companyId) {
      setError("Please select a company");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        start_date: startDate,
        end_date: endDate,
        company_id: companyId,
        ...(refCode && { ref_code: refCode }),
      };

      const data = await api.getReferralUsageTimeSeriesReport(params);
      setReportData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load referral data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load data when company changes
  useEffect(() => {
    if (companyId && !companiesLoading) {
      loadReferralData();
    }
  }, [companyId]);

  const generatePeriodSummaries = () => {
    if (!reportData) return [];

    const summaries = new Map();

    reportData.referrals.forEach((referral) => {
      // Generate period key based on interval and created date
      let period = "";
      const date = new Date(referral.created);

      switch (interval) {
        case "daily":
          period = date.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        case "weekly":
          // Get Monday of the week
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          period = monday.toISOString().split("T")[0];
          break;
        case "monthly":
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarterly":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          period = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "yearly":
          period = date.getFullYear().toString();
          break;
      }

      const key = `${period}-${referral.ref_code}-${referral.currency}`;

      if (!summaries.has(key)) {
        summaries.set(key, {
          period,
          ref_code: referral.ref_code,
          currency: referral.currency,
          referral_count: 0,
          total_amount: 0,
        });
      }

      const summary = summaries.get(key);
      summary.referral_count += 1;
      summary.total_amount += referral.amount * (refSplitPercent / 100);
    });

    return Array.from(summaries.values()).sort(
      (a, b) =>
        a.period.localeCompare(b.period) ||
        a.ref_code.localeCompare(b.ref_code),
    );
  };

  const summaryColumns = [
    { header: "Period", key: "period" },
    { header: "Ref Code", key: "ref_code" },
    { header: "Currency", key: "currency" },
    {
      header: "Referrals",
      key: "referral_count",
      render: (item: ReferralPeriodSummary) => (
        <span className="text-blue-400">
          {item.referral_count.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Total Amount",
      key: "total_amount",
      render: (item: ReferralPeriodSummary) => (
        <span className="text-green-400">
          {formatCurrency(item.total_amount, item.currency)}
        </span>
      ),
    },
  ];

  const prepareChartData = () => {
    if (!reportData) return [];

    const periodTotals = new Map();
    const refCodes = new Set<string>();

    // Collect all unique ref codes and build period data
    reportData.referrals.forEach((referral) => {
      refCodes.add(referral.ref_code);

      // Generate period key based on interval and created date
      let period = "";
      const date = new Date(referral.created);

      switch (interval) {
        case "daily":
          period = date.toISOString().split("T")[0];
          break;
        case "weekly":
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          period = monday.toISOString().split("T")[0];
          break;
        case "monthly":
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarterly":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          period = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "yearly":
          period = date.getFullYear().toString();
          break;
      }

      if (!periodTotals.has(period)) {
        const periodData: any = { period };
        periodTotals.set(period, periodData);
      }

      const total = periodTotals.get(period);

      // Convert to base currency using the provided rate
      const baseCurrencyAmount =
        (referral.currency === "BTC"
          ? (referral.amount / 1e11) * referral.rate
          : (referral.amount / 100) * referral.rate) * (refSplitPercent / 100);

      if (!total[referral.ref_code]) {
        total[referral.ref_code] = 0;
      }
      total[referral.ref_code] += baseCurrencyAmount;
    });

    // Initialize missing ref codes for all periods
    periodTotals.forEach((periodData) => {
      refCodes.forEach((code) => {
        if (!(code in periodData)) {
          periodData[code] = 0;
        }
      });
    });

    return Array.from(periodTotals.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  };

  const exportReferralsToCSV = () => {
    if (!reportData) return;

    const csvHeaders = [
      "VM ID",
      "Referral Code",
      "Created Date",
      "Amount (Main Unit)",
      "Currency",
      "Exchange Rate",
      "Base Currency Amount",
      "Base Currency",
    ];

    const csvRows = reportData.referrals.map((referral) => [
      referral.vm_id,
      referral.ref_code,
      new Date(referral.created).toISOString(),
      referral.currency === "BTC"
        ? ((referral.amount / 1e11) * (refSplitPercent / 100)).toFixed(8)
        : ((referral.amount / 100) * (refSplitPercent / 100)).toFixed(2),
      referral.currency,
      referral.rate,
      ((referral.currency === "BTC"
        ? (referral.amount / 1e11) * referral.rate
        : (referral.amount / 100) * referral.rate
      ) * (refSplitPercent / 100)).toFixed(2),
      referral.base_currency,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `referrals-${reportData.start_date}-to-${reportData.end_date}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const referralsTableColumns = [
    { header: "VM ID", key: "vm_id" },
    { header: "Referral Code", key: "ref_code" },
    {
      header: "Created",
      key: "created",
      render: (item: ReferralRecord) => (
        <span>{new Date(item.created).toLocaleString()}</span>
      ),
    },
    {
      header: "Amount",
      key: "amount",
      render: (item: ReferralRecord) => (
        <span className="text-green-400">
          {formatCurrency(item.amount * (refSplitPercent / 100), item.currency)}
        </span>
      ),
    },
    {
      header: "Rate",
      key: "rate",
      render: (item: ReferralRecord) => (
        <span className="text-gray-300">
          {formatCurrency(
            item.rate * (item.base_currency === "BTC" ? 1e9 : 100),
            item.base_currency,
            0,
          )}
        </span>
      ),
    },
    {
      header: "Base Amount",
      key: "base_amount",
      render: (item: ReferralRecord) => (
        <span className="text-blue-400">
          {formatCurrency(
            item.amount * (item.rate / (item.currency === "BTC" ? 1e9 : 100)) * (refSplitPercent / 100),
            item.base_currency,
          )}
        </span>
      ),
    },
    { header: "Base Currency", key: "base_currency" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Referrals Report</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadReferralData}
            variant="secondary"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {reportData && (
            <Button
              onClick={exportReferralsToCSV}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Interval
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as any)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              {INTERVALS.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Company
            </label>
            <select
              value={companyId || ""}
              onChange={(e) =>
                setCompanyId(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              disabled={companiesLoading}
            >
              {companiesLoading ? (
                <option value="">Loading companies...</option>
              ) : (
                <>
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Ref Code (Optional)
            </label>
            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              placeholder="e.g., PROMO2025"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Commission Amount %
            </label>
            <input
              type="number"
              value={refSplitPercent}
              onChange={(e) => setRefSplitPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              placeholder="33"
              min="0"
              max="100"
              step="0.01"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={loadReferralData}
              variant="primary"
              className="w-full"
              disabled={loading || !companyId}
            >
              {loading ? "Loading..." : "Load Data"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Loading referral data...</span>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <div className="flex items-center justify-center py-8 text-red-400">
            <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="font-semibold">Failed to load data</div>
              <div className="text-sm text-red-300 mt-1">{error}</div>
              <Button
                onClick={loadReferralData}
                variant="secondary"
                size="sm"
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Data Display */}
      {reportData && !loading && !error && (
        <>
          {/* Summary Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Amount</p>
                  <p className="text-white font-semibold">
                    {formatCurrency(
                      reportData.referrals.reduce(
                        (sum, r) =>
                          sum +
                          r.amount *
                            (r.rate / (r.currency === "BTC" ? 1e9 : 100)) *
                            (refSplitPercent / 100),
                        0,
                      ),
                      reportData.referrals[0]?.base_currency || "USD",
                    )}
                  </p>
                  <p className="text-blue-400 text-sm">
                    {reportData.referrals[0]?.base_currency || "USD"} Base
                    Currency
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Referrals</p>
                  <p className="text-white font-semibold">
                    {reportData.referrals.length.toLocaleString()}
                  </p>
                  <p className="text-blue-400 text-sm">
                    Successful conversions
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Unique Ref Codes</p>
                  <p className="text-white font-semibold">
                    {new Set(reportData.referrals.map((r) => r.ref_code)).size}
                  </p>
                  <p className="text-blue-400 text-sm">Different codes used</p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>

          {/* Referrals Chart */}
          <Card
            title={`Referral Amount by Ref Code (${reportData.referrals[0]?.base_currency || "USD"})`}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} ${reportData.referrals[0]?.base_currency || "USD"}`,
                      name,
                    ]}
                  />
                  {reportData &&
                    Array.from(
                      new Set(reportData.referrals.map((r) => r.ref_code)),
                    ).map((refCode, index) => {
                      const colors = [
                        "#3B82F6", // blue
                        "#EF4444", // red
                        "#10B981", // green
                        "#F59E0B", // yellow
                        "#8B5CF6", // purple
                        "#EC4899", // pink
                        "#14B8A6", // teal
                        "#F97316", // orange
                      ];
                      const color = colors[index % colors.length];

                      return (
                        <Line
                          key={refCode}
                          type="monotone"
                          dataKey={refCode}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ fill: color, strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                          name={refCode}
                        />
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detailed Period Summaries */}
          <Card title="Detailed Period Summaries by Ref Code and Currency">
            <Table
              columns={summaryColumns}
              data={generatePeriodSummaries().map((item) => ({
                ...item,
                id: `${item.period}-${item.ref_code}-${item.currency}`,
              }))}
            />
          </Card>

          {/* Individual Referrals */}
          <Card title="Individual Referral Records">
            <Table
              columns={referralsTableColumns}
              data={reportData.referrals.map((item) => ({
                ...item,
                id: `${item.vm_id}-${item.ref_code}`,
              }))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
