import clsx from "clsx";
import type React from "react";

/**
 * Shared page header for list views: a title, optional subtitle, an inline
 * "Label: value" stats row, and a right-aligned actions slot (search, filters,
 * create button, …).
 *
 * Every list page rendered its own bespoke header markup, so column counts,
 * gaps and value colours had drifted apart. Feed this a `stats` array instead
 * so the layout and tone palette live in one place.
 *
 *   <StatsHeader
 *     title="Users"
 *     stats={[
 *       { label: "Total", value: total },
 *       { label: "Admins", value: admins, tone: "warning" },
 *     ]}
 *     actions={<FilterButton .../>}
 *   />
 */

export type StatTone = "default" | "accent" | "success" | "warning" | "danger" | "muted" | "purple" | "orange";

export interface StatItem {
  label: string;
  value: React.ReactNode;
  /** Colour of the value. Defaults to "default" (white). */
  tone?: StatTone;
  /** Optional tooltip on the value. */
  title?: string;
}

const toneClass: Record<StatTone, string> = {
  default: "text-white",
  accent: "text-blue-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  danger: "text-red-400",
  muted: "text-slate-400",
  purple: "text-purple-300",
  orange: "text-orange-400",
};

interface StatsHeaderProps {
  /** Page title. Omit for a stats-only row (e.g. when the page has its own header). */
  title?: string;
  subtitle?: React.ReactNode;
  stats?: StatItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function StatsHeader({ title, subtitle, stats, actions, className }: StatsHeaderProps) {
  return (
    <div className={clsx("flex items-start justify-between gap-6 flex-wrap", className)}>
      <div className="min-w-0">
        {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
        {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <div className={clsx("flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400", title && "mt-2")}>
            {stats.map((stat) => (
              <span key={stat.label}>
                {stat.label}:{" "}
                <span className={clsx("font-medium", toneClass[stat.tone ?? "default"])} title={stat.title}>
                  {stat.value}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
    </div>
  );
}
