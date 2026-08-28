import { countryFlagEmoji, getAllCountriesAlpha2 } from "../lib/api";

interface CountrySelectProps {
  /** ISO 3166-1 alpha-2 code, or "" for no country. */
  value: string;
  onChange: (countryCode: string) => void;
  id?: string;
  className?: string;
  /** Label for the empty option. */
  emptyLabel?: string;
  disabled?: boolean;
}

const COUNTRIES = getAllCountriesAlpha2();

/**
 * Alpha-2 country picker.
 *
 * Alpha-2 rather than alpha-3 because that is what a region stores and what
 * flag rendering needs; users carry alpha-3 and use `getAllCountries`.
 */
export function CountrySelect({
  value,
  onChange,
  id,
  className = "",
  emptyLabel = "No country",
  disabled = false,
}: CountrySelectProps) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className} disabled={disabled}>
      <option value="">{emptyLabel}</option>
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {countryFlagEmoji(country.code)} {country.name} ({country.code})
        </option>
      ))}
    </select>
  );
}
