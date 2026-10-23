import { useEffect, useId, useRef, useState } from "react";
import { CURRENCIES, fromSmallestUnits, toSmallestUnits } from "../utils/currency";

/** The unit an amount is entered in for a given currency (sats for BTC, else the code). */
function currencyUnitLabel(currency: string): string {
  return currency === "BTC" ? "sats" : currency;
}

/** Human-readable buffer string for a smallest-units value ("" for 0 so placeholders show). */
function bufferFrom(value: number, currency: string, scale: number): string {
  return value ? String(fromSmallestUnits(value, currency, scale)) : "";
}

interface CurrencySelectProps {
  value: string;
  onChange: (currency: string) => void;
  currencies?: readonly string[];
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/** A currency `<select>` backed by the shared currency list. */
export function CurrencySelect({
  value,
  onChange,
  currencies = CURRENCIES,
  id,
  disabled,
  required,
  className,
}: CurrencySelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={className}
    >
      {currencies.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

interface MoneyAmountInputProps {
  /** Amount in smallest currency units (cents for fiat, milli-sats for BTC). */
  value: number;
  /** Currency the amount is denominated in — drives unit conversion. */
  currency: string;
  /** Fired with the new amount in smallest units. */
  onChange: (amount: number) => void;
  /**
   * The amount is in 1/`scale` of the smallest unit (default 1). Custom pricing
   * rates use a finer unit so an hourly rate can hold a fraction of a cent.
   */
  scale?: number;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * A number input that edits a smallest-units money value while letting the user
 * freely type a human-readable amount (dollars / sats). Callers only ever deal in
 * smallest units; the string buffer and `to/fromSmallestUnits` conversion live here.
 */
export function MoneyAmountInput({
  value,
  currency,
  onChange,
  scale = 1,
  id,
  disabled,
  required,
  placeholder,
  className,
}: MoneyAmountInputProps) {
  const [text, setText] = useState(() => bufferFrom(value, currency, scale));
  // Tracks the last value we emitted so external updates can be told apart from our own echoes.
  const lastEmitted = useRef(value);
  const prevCurrency = useRef(currency);

  const emit = (nextText: string, cur: string) => {
    const units = toSmallestUnits(Number.parseFloat(nextText) || 0, cur, scale);
    lastEmitted.current = units;
    onChange(units);
  };

  // Adopt genuinely external value changes (e.g. async edit-modal load) into the buffer.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(bufferFrom(value, currency, scale));
    }
  }, [value, currency, scale]);

  // On a currency switch keep the typed number but re-derive its smallest-units value.
  useEffect(() => {
    if (prevCurrency.current !== currency) {
      prevCurrency.current = currency;
      emit(text, currency);
    }
  });

  const handleChange = (next: string) => {
    setText(next);
    emit(next, currency);
  };

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step="any"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={className}
    />
  );
}

interface MoneyInputProps {
  /** Amount in smallest currency units (cents for fiat, milli-sats for BTC). */
  amount: number;
  currency: string;
  onChange: (next: { amount: number; currency: string }) => void;
  label?: string;
  /** Extra unit qualifier appended after the currency, e.g. "/core", "/GB", "/IP". */
  unitSuffix?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  currencies?: readonly string[];
  hint?: string;
}

/**
 * Combined amount + currency money field. State is kept in smallest units so the
 * caller never touches conversion or the currency `<select>` wiring.
 */
export function MoneyInput({
  amount,
  currency,
  onChange,
  label,
  unitSuffix,
  required,
  disabled,
  placeholder,
  currencies,
  hint,
}: MoneyInputProps) {
  const id = useId();
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-white mb-2">
          {label} ({currencyUnitLabel(currency)}
          {unitSuffix ?? ""}){required ? " *" : ""}
        </label>
      )}
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <MoneyAmountInput
          id={id}
          value={amount}
          currency={currency}
          onChange={(a) => onChange({ amount: a, currency })}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
        />
        <CurrencySelect
          value={currency}
          onChange={(c) => onChange({ amount, currency: c })}
          currencies={currencies}
          disabled={disabled}
        />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
