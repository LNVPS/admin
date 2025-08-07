import React from "react";

interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

export function Table<T extends { id: string | number }>({
  columns,
  data,
  isLoading,
  onRowClick,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-800 p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-slate-800">
      <table className="min-w-full divide-y divide-slate-700">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key.toString()}
                className="px-0.5 py-0.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={
                onRowClick
                  ? "cursor-pointer transition-colors hover:bg-slate-700"
                  : ""
              }
            >
              {columns.map((column) => (
                <td
                  key={`${item.id}-${column.key}`}
                  className="whitespace-nowrap px-0.5 py-0.5 text-xs text-slate-200"
                >
                  {column.render
                    ? column.render(item)
                    : (() => {
                        const value = item[column.key as keyof T];
                        if (value === null || value === undefined) {
                          return "-";
                        }
                        if (typeof value === "object") {
                          return JSON.stringify(value);
                        }
                        return String(value);
                      })()}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-0.5 py-1 text-center text-xs text-slate-400"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="mt-2 flex items-center justify-between px-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-xs text-slate-400">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-0 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          className="h-5 w-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}
