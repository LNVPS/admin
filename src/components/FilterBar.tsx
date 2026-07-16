import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type React from "react";
import { Button } from "./Button";

/**
 * Shared filtering UI for list pages.
 *
 * Design intent: filters read as part of the same "instrument cluster" as the
 * stats strip above them — the uppercase micro-eyebrow field labels and the
 * display-face count badge deliberately echo the stat cells, so a filtered
 * list feels like one coherent control surface rather than a bolted-on dialog.
 *
 * Composition (page owns the open state):
 *   const [open, setOpen] = useState(false);
 *   <FilterButton open={open} activeCount={countActiveFilters(fields)} onClick={() => setOpen(o => !o)} />
 *   <FilterBar open={open} fields={fields} onClear={...} onClose={() => setOpen(false)} />
 */

type ColSpan = 1 | 2 | 3;

interface BaseField {
  /** Stable key, also used for the label's htmlFor association. */
  key: string;
  label: string;
  /** Optional helper text shown under the control. */
  hint?: string;
  /** Grid columns this field occupies on md+ screens. Default 1. */
  colSpan?: ColSpan;
}

interface TextField extends BaseField {
  kind: "text" | "number";
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

interface SelectField extends BaseField {
  kind: "select";
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface CheckboxField extends BaseField {
  kind: "checkbox";
  value: boolean;
  onChange: (value: boolean) => void;
}

export type FilterField = TextField | SelectField | CheckboxField;

/** True when a field is narrowing the result set (used for the active badge + Clear). */
function isFieldActive(field: FilterField): boolean {
  if (field.kind === "checkbox") return field.value;
  return field.value.trim() !== "";
}

/** Count of fields currently narrowing the list — drives the trigger badge. */
export function countActiveFilters(fields: FilterField[]): number {
  return fields.reduce((count, field) => count + (isFieldActive(field) ? 1 : 0), 0);
}

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400";
const colSpanClass: Record<ColSpan, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

interface FilterButtonProps {
  open: boolean;
  activeCount: number;
  onClick: () => void;
  /** Optional label override (default "Filters"). */
  label?: string;
  className?: string;
}

/** Header trigger: funnel + a display-face count badge that mirrors the stat cells. */
export function FilterButton({ open, activeCount, onClick, label = "Filters", className }: FilterButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      aria-expanded={open}
      className={clsx("relative", open && "border-blue-500/60", className)}
    >
      <FunnelIcon className="h-4 w-4 mr-2" />
      {label}
      {activeCount > 0 && (
        <span className="font-display absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-bold text-slate-950">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

function FieldControl({ field }: { field: FilterField }) {
  if (field.kind === "checkbox") {
    return (
      <label htmlFor={field.key} className="flex items-center gap-2 py-2 text-sm text-slate-200 cursor-pointer">
        <input
          id={field.key}
          type="checkbox"
          checked={field.value}
          onChange={(e) => field.onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <select id={field.key} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.key}
      type={field.kind}
      value={field.value}
      placeholder={field.placeholder}
      onChange={(e) => field.onChange(e.target.value)}
    />
  );
}

interface FilterBarProps {
  open: boolean;
  fields: FilterField[];
  onClear: () => void;
  onClose: () => void;
  /** Extra controls rendered in the panel footer, left of the Clear button. */
  footer?: React.ReactNode;
}

/**
 * Collapsible filter panel. Renders nothing when closed (so it never adds a gap
 * under the header) and reveals with a short, reduced-motion-aware transition.
 * Meant to sit directly below the page header, above the table.
 */
export function FilterBar({ open, fields, onClear, onClose, footer }: FilterBarProps) {
  const activeCount = countActiveFilters(fields);

  if (!open) return null;

  return (
    <div className="animate-filter-reveal rounded-lg border border-slate-700 bg-slate-800">
      {/* Accent header ties the panel to the neon-green brand rail. */}
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 rounded-full bg-blue-500" />
          <span className={eyebrow}>Filters</span>
          {activeCount > 0 && <span className="text-xs text-slate-500">· {activeCount} active</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className={clsx("min-w-0", field.colSpan && colSpanClass[field.colSpan])}>
            {field.kind !== "checkbox" && (
              <label htmlFor={field.key} className={clsx("mb-1.5 block", eyebrow)}>
                {field.label}
              </label>
            )}
            <FieldControl field={field} />
            {field.hint && <p className="mt-1 text-xs text-slate-500">{field.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
        <div className="min-w-0">{footer}</div>
        <Button variant="ghost" onClick={onClear} disabled={activeCount === 0}>
          Clear all
        </Button>
      </div>
    </div>
  );
}
