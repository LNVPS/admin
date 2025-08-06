import React from "react";
import clsx from "clsx";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Card({ title, children, className, actions, icon }: CardProps) {
  return (
    <div className={clsx("rounded-lg bg-slate-800 shadow-lg", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          {title && (
            <div className="flex items-center">
              {icon && <div className="mr-2 text-slate-400">{icon}</div>}
              <h3 className="text-lg font-medium text-white">{title}</h3>
            </div>
          )}
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg bg-slate-800 p-4 shadow-lg transition-transform hover:scale-105",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {trend && (
        <div className="mt-2 flex items-center">
          <span
            className={clsx(
              "text-sm font-medium",
              trend.isPositive ? "text-green-500" : "text-red-500",
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <svg
            className={clsx(
              "ml-1 h-4 w-4",
              trend.isPositive ? "text-green-500" : "text-red-500",
            )}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              d={
                trend.isPositive
                  ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              }
            />
          </svg>
        </div>
      )}
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="border-t border-slate-700 py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-white sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

export function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-slate-700">{children}</dl>;
}
