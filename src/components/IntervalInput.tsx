import { useEffect, useId, useRef, useState } from "react";

/** Billing interval unit shared across the catalog, subscriptions and cost plans. */
export type IntervalType = "day" | "month" | "year";

interface IntervalInputProps {
  /** How many `type` units per interval (e.g. 3 with "month" = quarterly). */
  amount: number;
  type: IntervalType;
  onChange: (next: { amount: number; type: IntervalType }) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Fallback used when the amount field is cleared (default 1). */
  minAmount?: number;
}

const UNIT_LABELS: Record<IntervalType, [string, string]> = {
  day: ["Day", "Days"],
  month: ["Month", "Months"],
  year: ["Year", "Years"],
};

/**
 * Combined interval amount + unit field ("every N days/months/years"). Pairs with
 * `MoneyInput` for recurring pricing; callers deal only in `{ amount, type }`.
 */
export function IntervalInput({
  amount,
  type,
  onChange,
  label,
  required,
  disabled,
  minAmount = 1,
}: IntervalInputProps) {
  const id = useId();
  const [text, setText] = useState(() => String(amount));
  const lastEmitted = useRef(amount);

  // Adopt genuinely external amount changes (e.g. async edit load) into the buffer.
  useEffect(() => {
    if (amount !== lastEmitted.current) {
      lastEmitted.current = amount;
      setText(String(amount));
    }
  }, [amount]);

  const handleAmount = (next: string) => {
    setText(next);
    const parsed = Number.parseInt(next, 10);
    const value = Number.isNaN(parsed) ? minAmount : parsed;
    lastEmitted.current = value;
    onChange({ amount: value, type });
  };

  const plural = amount === 1 ? 0 : 1;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-white mb-2">
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={text}
          onChange={(e) => handleAmount(e.target.value)}
          disabled={disabled}
          required={required}
        />
        <select
          value={type}
          onChange={(e) => onChange({ amount, type: e.target.value as IntervalType })}
          disabled={disabled}
          required={required}
        >
          <option value="day">{UNIT_LABELS.day[plural]}</option>
          <option value="month">{UNIT_LABELS.month[plural]}</option>
          <option value="year">{UNIT_LABELS.year[plural]}</option>
        </select>
      </div>
    </div>
  );
}
