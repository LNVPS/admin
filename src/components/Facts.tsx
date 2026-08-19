import clsx from "clsx";
import type React from "react";

/**
 * One fact, on one line.
 *
 * The label sits in a fixed column beside its value rather than above it: a
 * record is read by scanning down the values, and stacking each pair doubles
 * the height of every group for no gain in legibility.
 */
export function Fact({
  label,
  children,
  mono = false,
  span = false,
}: {
  label: string;
  children: React.ReactNode;
  /** For machine values an operator compares or copies character by character. */
  mono?: boolean;
  /** Let a long value (an address, a warning) run the full width of the grid. */
  span?: boolean;
}) {
  return (
    <div className={clsx("flex min-w-0 gap-2 text-sm", span && "sm:col-span-2 xl:col-span-3")}>
      <dt className="w-16 shrink-0 pt-px text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={clsx("min-w-0 flex-1 text-slate-200", mono && "break-all font-mono text-xs")}>{children}</dd>
    </div>
  );
}

/**
 * A band of facts inside the record panel.
 *
 * The band label lives in a left gutter rather than on its own line above the
 * facts. On a desktop admin screen there is width to spare and height is what
 * runs out: a heading row per band spends four lines of a nine-line record
 * saying three words.
 */
export function FactGroup({
  label,
  action,
  children,
}: {
  label: string;
  /** Optional control for this band, parked at the end of the row. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3 border-t border-slate-700/70 px-3 py-2 first:border-t-0">
      <h3 className="w-16 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </h3>
      <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </section>
  );
}

/** The value shown when a field was never filled in. */
export function NotSet({ children = "Not set" }: { children?: React.ReactNode }) {
  return <span className="text-slate-600">{children}</span>;
}

/**
 * Heading for one of the record's sibling tables (VMs, subscriptions, roles).
 *
 * Deliberately quieter than the page's own identity: these are repeated five
 * times down the page, and at `text-xl` with an icon each they read as five
 * competing titles rather than as dividers within one record.
 */
export function SectionHeading({
  icon,
  children,
  action,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-700/70 pb-1.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        {icon}
        {children}
      </h2>
      {action && <div className="flex items-center gap-4 text-xs text-slate-400">{action}</div>}
    </div>
  );
}
