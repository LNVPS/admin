import { useEffect, useState } from "react";
import { useApiCall } from "../hooks/useApiCall";
import type { PaginatedApiResponse } from "../lib/api";
import { Card } from "./Card";
import { ErrorState } from "./ErrorState";
import { Pagination } from "./Table";

interface PaginatedTableProps<T> {
  // API function that returns paginated data
  apiCall: (params: { limit: number; offset: number }) => Promise<PaginatedApiResponse<T>>;

  // Rendering functions
  renderHeader: () => React.ReactNode;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;

  // Configuration
  itemsPerPage?: number;
  errorAction?: string;
  loadingMessage?: string;

  // Additional dependencies for useApiCall
  dependencies?: any[];

  // Optional stats calculation
  calculateStats?: (items: T[], totalItems: number, error?: Error | null) => React.ReactNode;

  // Optional content rendered between the stats header and the table (e.g. a filter panel)
  toolbar?: React.ReactNode;

  // Table styling
  tableClassName?: string;
  minWidth?: string;

  // Show errors inline instead of blocking the page
  inlineError?: boolean;
}

export function PaginatedTable<T>({
  apiCall,
  renderHeader,
  renderRow,
  renderEmptyState,
  itemsPerPage = 20,
  errorAction = "load data",
  loadingMessage = "Loading...",
  dependencies = [],
  calculateStats,
  toolbar,
  tableClassName = "",
  minWidth = "1200px",
  inlineError = false,
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when dependencies change (e.g., filters)
  useEffect(() => {
    setCurrentPage(1);
  }, dependencies);

  const {
    data: response,
    loading,
    error,
    retry,
  } = useApiCall(
    () =>
      apiCall({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }),
    [currentPage, ...dependencies],
  );

  // Non-inline errors still take over the whole view (loading never does — the
  // spinner is confined to the table section so the header/filters stay put).
  if (error && !inlineError) {
    return <ErrorState error={error} onRetry={retry} action={errorAction} />;
  }

  const items = response?.data || [];
  const totalItems = response?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const defaultEmptyState = () => (
    <div className="text-center py-8">
      <p className="text-gray-400">No items found</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {calculateStats && calculateStats(items, totalItems, error)}

      {/* Toolbar (filters, etc.) — sits under the header, above the table */}
      {toolbar}

      {/* Table */}
      <Card>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
              <span className="text-sm text-slate-400">{loadingMessage}</span>
            </div>
          ) : inlineError && error ? (
            <div className="flex py-4 items-center justify-center">
              <div className="text-red-400">
                Failed to {errorAction}: {error.message}
              </div>
            </div>
          ) : items.length === 0 ? (
            renderEmptyState ? (
              renderEmptyState()
            ) : (
              defaultEmptyState()
            )
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full divide-y divide-gray-700 ${tableClassName}`} style={{ minWidth }}>
                <thead>
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-[10px] [&>th]:font-semibold [&>th]:text-gray-400 [&>th]:uppercase [&>th]:tracking-[0.14em] [&>th]:bg-slate-800/60 [&>th]:border-b [&>th]:border-gray-700">
                    {renderHeader()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 [&>tr]:transition-colors [&>tr]:hover:bg-slate-800 [&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr>td]:text-[13px] [&>tr>td]:leading-snug">
                  {items.map((item, index) => renderRow(item, index))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </Card>
    </div>
  );
}
