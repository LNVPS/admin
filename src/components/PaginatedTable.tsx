import { useState, useEffect } from "react";
import { useApiCall } from "../hooks/useApiCall";
import { ErrorState } from "./ErrorState";
import { Card } from "./Card";
import { Pagination } from "./Table";
import { PaginatedApiResponse } from "../lib/api";

interface PaginatedTableProps<T> {
  // API function that returns paginated data
  apiCall: (params: {
    limit: number;
    offset: number;
  }) => Promise<PaginatedApiResponse<T>>;

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
  calculateStats?: (items: T[], totalItems: number) => React.ReactNode;

  // Table styling
  tableClassName?: string;
  minWidth?: string;
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
  tableClassName = "",
  minWidth = "1200px",
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

  if (error) {
    return <ErrorState error={error} onRetry={retry} action={errorAction} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">{loadingMessage}</div>
      </div>
    );
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
      {calculateStats && calculateStats(items, totalItems)}

      {/* Table */}
      <Card>
        <div className="p-0">
          {items.length === 0 ? (
            renderEmptyState ? (
              renderEmptyState()
            ) : (
              defaultEmptyState()
            )
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full divide-y divide-gray-700 ${tableClassName}`}
                style={{ minWidth }}
              >
                <thead>
                  <tr className="[&>th]:px-1 [&>th]:py-1 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-gray-300 [&>th]:uppercase [&>th]:tracking-wider">
                    {renderHeader()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 [&>tr]:hover:bg-gray-800 [&>tr>td]:px-0.5 [&>tr>td]:py-0.5 [&>tr>td]:text-xs">
                  {items.map((item, index) => renderRow(item, index))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
}
