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
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { TimeSeriesReportData, AdminCompanyInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";

const INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "CHF", "AUD", "JPY", "BTC"];

export function SalesReportPage() {
  const [reportData, setReportData] = useState<TimeSeriesReportData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

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
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("");

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

  const loadTimeSeriesData = async () => {
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
        ...(currency && { currency }),
      };

      const data = await api.getTimeSeriesReport(params);
      setReportData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load time-series data",
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
      loadTimeSeriesData();
    }
  }, [companyId]);

  const baseCurrency = reportData?.payments[0]?.company_base_currency || "USD";

  const calculateTotalsByPeriod = () => {
    if (!reportData) return [];

    const periodTotals = new Map();

    reportData.payments.forEach((payment) => {
      // Generate period key based on interval and created date
      let period = "";
      const date = new Date(payment.created);

      switch (interval) {
        case "daily":
          period = date.toISOString().split("T")[0];
          break;
        case "weekly": {
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          period = monday.toISOString().split("T")[0];
          break;
        }
        case "monthly":
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarterly": {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          period = `${date.getFullYear()}-Q${quarter}`;
          break;
        }
        case "yearly":
          period = date.getFullYear().toString();
          break;
      }

      if (!periodTotals.has(period)) {
        periodTotals.set(period, {
          period,
          payment_count: 0,
          currency: baseCurrency,
          net_total_base: 0,
          tax_total_base: 0,
          gross_total_base: 0,
        });
      }

      const total = periodTotals.get(period);
      total.payment_count += 1;

      // Convert payment amounts to base currency
      const mul = payment.currency === "BTC" ? 1e9 : 100;
      const netAmount = payment.amount * (payment.rate / mul);
      const taxAmount = payment.tax * (payment.rate / mul);

      total.net_total_base += netAmount;
      total.tax_total_base += taxAmount;
      total.gross_total_base += netAmount + taxAmount;
    });

    return Array.from(periodTotals.values())
      .map((total) => ({
        ...total,
        id: total.period,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  const prepareChartData = () => {
    const periodTotals = calculateTotalsByPeriod();
    return periodTotals.map((period) => ({
      period: period.period,
      total: period.gross_total_base,
    }));
  };

  const generateSalesReportFormat = () => {
    if (!reportData) return null;

    const baseCurrency = reportData.payments[0]?.company_base_currency || "USD";

    // Calculate exchange rates from the payment data
    const exchangeRates: Record<string, number> = {};
    reportData.payments.forEach((payment) => {
      if (
        payment.currency !== baseCurrency &&
        !exchangeRates[`${payment.currency}_${baseCurrency}`]
      ) {
        exchangeRates[`${payment.currency}_${baseCurrency}`] = payment.rate;
      }
    });

    // Group payments by currency and create items
    const currencyTotals: Record<string, { net: number; tax: number }> = {};

    reportData.payments.forEach((payment) => {
      if (!currencyTotals[payment.currency]) {
        currencyTotals[payment.currency] = { net: 0, tax: 0 };
      }

      currencyTotals[payment.currency].net += payment.amount;
      currencyTotals[payment.currency].tax += payment.tax;
    });

    const items: Array<{
      description: string;
      currency: string;
      qty: number;
      rate: number;
      tax?: number;
    }> = [];

    Object.entries(currencyTotals).forEach(([currency, totals]) => {
      // Add sales item (net amount)
      if (totals.net > 0) {
        items.push({
          description: "LNVPS Sales",
          currency: currency,
          qty: 1,
          rate: totals.net,
        });
      }

      // Add tax item if there's tax
      if (totals.tax > 0) {
        items.push({
          description: "Tax Collected",
          currency: currency,
          qty: 1,
          rate: totals.tax,
        });
      }
    });

    return {
      date: endDate,
      exchange_rate: exchangeRates,
      items: items,
    };
  };

  const copyToClipboard = async () => {
    const salesReportData = generateSalesReportFormat();
    if (!salesReportData) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(salesReportData, null, 2),
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const exportPaymentsToCSV = () => {
    if (!reportData) return;

    const csvHeaders = [
      "Period",
      "VM ID",
      "Created",
      "Amount (Main Unit)",
      "Currency",
      "Payment Method",
      "Tax (Main Unit)",
      "Is Paid",
      "Rate",
    ];

    const csvRows = reportData.payments.map((payment) => [
      payment.period,
      payment.vm_id,
      new Date(payment.created).toISOString(),
      payment.currency === "BTC"
        ? (payment.amount / 1e11).toFixed(8)
        : (payment.amount / 100).toFixed(2),
      payment.currency,
      payment.payment_method,
      payment.currency === "BTC"
        ? (payment.tax / 1e11).toFixed(8)
        : (payment.tax / 100).toFixed(2),
      payment.is_paid ? "Yes" : "No",
      payment.rate,
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
      `payments-${reportData.start_date}-to-${reportData.end_date}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overviewColumns = [
    { header: "Period", key: "period" },
    {
      header: "Payments",
      key: "payment_count",
      render: (item: any) => (
        <span className="text-blue-400">
          {item.payment_count.toLocaleString()}
        </span>
      ),
    },
    { header: "Currency", key: "currency" },
    {
      header: `Net (${baseCurrency})`,
      key: "net_total_base",
      render: (item: any) => {
        return (
          <span className="text-green-400">
            {formatCurrency(item.net_total_base, baseCurrency)}
          </span>
        );
      },
    },
    {
      header: `Tax (${baseCurrency})`,
      key: "tax_total_base",
      render: (item: any) => {
        return (
          <span className="text-yellow-400">
            {formatCurrency(item.tax_total_base, baseCurrency)}
          </span>
        );
      },
    },
    {
      header: `Total (${baseCurrency})`,
      key: "gross_total_base",
      render: (item: any) => {
        return (
          <span className="text-blue-400 font-semibold">
            {formatCurrency(item.gross_total_base, baseCurrency)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentChartBarIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Sales Report</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadTimeSeriesData}
            variant="secondary"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {reportData && (
            <>
              <Button
                onClick={exportPaymentsToCSV}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Payments CSV
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                {copySuccess ? "Copied!" : "Copy Sales Format"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
              Currency (Optional)
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Currencies</option>
              {CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={loadTimeSeriesData}
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
            <span className="ml-3 text-gray-300">
              Loading time-series data...
            </span>
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
                onClick={loadTimeSeriesData}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Company</p>
                  <p className="text-white font-semibold">
                    {companies.find((c) => c.id === companyId)?.name ||
                      "Unknown"}
                  </p>
                  <p className="text-blue-400 text-sm">
                    Base:{" "}
                    {reportData.payments[0]?.company_base_currency || "USD"}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Periods</p>
                  <p className="text-white font-semibold">
                    {calculateTotalsByPeriod().length}
                  </p>
                  <p className="text-blue-400 text-sm">{interval}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Payments</p>
                  <p className="text-white font-semibold">
                    {reportData.payments.length.toLocaleString()}
                  </p>
                  <p className="text-blue-400 text-sm">Individual records</p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Amount</p>
                  <p className="text-white font-semibold">
                    {(() => {
                      const baseCurrency =
                        reportData.payments[0]?.company_base_currency || "USD";
                      const total = calculateTotalsByPeriod().reduce(
                        (sum, p) => sum + p.gross_total_base,
                        0,
                      );
                      return formatCurrency(total, baseCurrency);
                    })()}
                  </p>
                  <p className="text-blue-400 text-sm">
                    {reportData.payments[0]?.company_base_currency || "USD"}{" "}
                    Base
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card
            title={`Revenue Trend (${reportData.payments[0]?.company_base_currency || "USD"})`}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => {
                      return formatCurrency(value, baseCurrency);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number) => {
                      return [
                        formatCurrency(value, baseCurrency),
                        "Total Revenue",
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: "#3B82F6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Period Overview */}
          <Card
            title={`Period Overview (${reportData.payments[0]?.company_base_currency || "USD"} Base Currency)`}
          >
            <Table columns={overviewColumns} data={calculateTotalsByPeriod()} />
          </Card>

          {/* Individual Payments */}
          <Card title="Individual Payments">
            <Table
              columns={[
                { header: "VM ID", key: "vm_id" },
                {
                  header: "Created",
                  key: "created",
                  render: (item: any) =>
                    new Date(item.created).toLocaleDateString(),
                },
                { header: "Currency", key: "currency" },
                {
                  header: "Amount",
                  key: "amount",
                  render: (item: any) => (
                    <span className="text-green-400">
                      {formatCurrency(item.amount, item.currency)}
                    </span>
                  ),
                },
                {
                  header: "Tax",
                  key: "tax",
                  render: (item: any) => (
                    <span className="text-yellow-400">
                      {formatCurrency(item.tax, item.currency)}
                    </span>
                  ),
                },
                { header: "Payment Method", key: "payment_method" },
                {
                  header: "Rate",
                  key: "rate",
                  render: (item: any) => {
                    if (item.rate === 1) return "";
                    return formatCurrency(
                      item.rate *
                        (item.company_base_currency === "BTC" ? 1e9 : 100),
                      item.company_base_currency,
                      0,
                    );
                  },
                },
              ]}
              data={reportData.payments.map((item, index) => ({
                ...item,
                id: index,
              }))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
