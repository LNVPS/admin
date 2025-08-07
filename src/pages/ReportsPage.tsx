import React, { useState, useEffect } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAdminApi } from "../hooks/useAdminApi";
import { DocumentDuplicateIcon, ExclamationTriangleIcon, CalendarIcon } from "@heroicons/react/24/outline";

interface MonthlySalesReportData {
  date: string;
  exchange_rate: Record<string, number>;
  items: Array<{
    description: string;
    currency: string;
    qty: number;
    rate: number;
    tax: number;
  }>;
}

export function ReportsPage() {
  const [reportData, setReportData] = useState<MonthlySalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const api = useAdminApi();

  const loadReportsData = async (year?: number, month?: number) => {
    const targetYear = year ?? selectedYear;
    const targetMonth = month ?? selectedMonth;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getMonthlySalesReport(targetYear, targetMonth);
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    loadReportsData();
  };

  const copyToClipboard = async () => {
    if (!reportData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: currency === 'BTC' ? 8 : 2,
      maximumFractionDigits: currency === 'BTC' ? 8 : 2,
    }).format(amount);
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Report Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Report Date</h3>
            <p className="text-2xl font-bold text-primary-400">{reportData.date}</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Currency Items</h3>
            <p className="text-2xl font-bold text-primary-400">{reportData.items.length}</p>
          </div>
        </div>

        {/* Exchange Rates */}
        {Object.keys(reportData.exchange_rate).length > 0 && (
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Exchange Rates (to EUR)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(reportData.exchange_rate).map(([currency, rate]) => (
                <div key={currency} className="flex justify-between items-center p-3 bg-dark-800 rounded">
                  <span className="font-medium text-white">{currency.replace('_EUR', '')}</span>
                  <span className="text-primary-400">{formatCurrency(rate, currency.split('_')[0])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Items */}
        <div className="bg-dark-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Sales Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left py-3 px-4 font-medium text-dark-300">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-dark-300">Currency</th>
                  <th className="text-right py-3 px-4 font-medium text-dark-300">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-dark-300">Rate (Net)</th>
                  <th className="text-right py-3 px-4 font-medium text-dark-300">Tax %</th>
                </tr>
              </thead>
              <tbody>
                {reportData.items.map((item, index) => (
                  <tr key={index} className="border-b border-dark-600 last:border-b-0">
                    <td className="py-3 px-4 text-white">{item.description}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-900 text-primary-300">
                        {item.currency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white">{item.qty}</td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      {formatCurrency(item.rate, item.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-white">{item.tax}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);
  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Monthly Sales Reports</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => loadReportsData()}
            variant="secondary"
            size="sm"
            disabled={loading}
          >
            Refresh
          </Button>
          {reportData && (
            <Button
              onClick={copyToClipboard}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              {copySuccess ? "Copied!" : "Copy JSON"}
            </Button>
          )}
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-primary-500" />
          <span className="font-medium text-white">Select Report Date:</span>
          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <Button
              onClick={handleDateChange}
              variant="primary"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              Load Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-3 text-dark-300">Loading sales report...</span>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <div className="flex items-center justify-center py-12 text-red-400">
            <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="font-semibold">Failed to load report</div>
              <div className="text-sm text-red-300 mt-1">{error}</div>
              <Button
                onClick={() => loadReportsData()}
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

      {/* Report Content */}
      {reportData && !loading && !error && (
        <Card title={`Monthly Sales Report - ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear}`}>
          {renderReportContent()}
        </Card>
      )}

      {/* Raw JSON View */}
      {reportData && (
        <Card title="Raw JSON Data">
          <div className="bg-dark-800 rounded-lg p-4 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap text-dark-300">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}