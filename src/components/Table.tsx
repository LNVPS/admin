import type React from "react";
import { useState } from "react";

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
                className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
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
                  className="whitespace-nowrap px-3 py-2 text-[13px] text-slate-200"
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

// Compute a windowed list of page numbers with ellipsis gaps, e.g. 1 … 4 5 [6] 7 8 … 20
function getPageItems(current: number, total: number, window = 1): (number | "gap")[] {
  const items: (number | "gap")[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= current - window && p <= current + window)) {
      items.push(p);
    } else if (items[items.length - 1] !== "gap") {
      items.push("gap");
    }
  }
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const [jump, setJump] = useState("");

  const go = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(jump, 10);
    if (!Number.isNaN(n)) go(n);
    setJump("");
  };

  const ctrl =
    "rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 px-2">
      <div className="flex items-center gap-1">
        <button className={ctrl} onClick={() => go(1)} disabled={currentPage === 1} title="First page">
          «
        </button>
        <button className={ctrl} onClick={() => go(currentPage - 1)} disabled={currentPage === 1} title="Previous page">
          ‹
        </button>
        {getPageItems(currentPage, totalPages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-500">
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => go(item)}
              aria-current={item === currentPage ? "page" : undefined}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                item === currentPage
                  ? "bg-blue-500 text-slate-950"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          className={ctrl}
          onClick={() => go(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          ›
        </button>
        <button
          className={ctrl}
          onClick={() => go(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          »
        </button>
      </div>

      <form onSubmit={submitJump} className="flex items-center gap-2">
        <span className="text-xs text-slate-400">
          Page {currentPage} of {totalPages}
        </span>
        <div className="w-16">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder="Go to"
            className="!px-2 !py-1 text-xs"
          />
        </div>
        <button type="submit" className={ctrl} disabled={!jump.trim()}>
          Go
        </button>
      </form>
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
