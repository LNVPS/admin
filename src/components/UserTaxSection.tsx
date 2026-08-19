import { ExclamationTriangleIcon, ReceiptPercentIcon } from "@heroicons/react/24/outline";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import type { AdminUserTaxDetermination, TaxTreatment } from "../lib/api";

/**
 * Labels for how a sale is treated.
 *
 * Shown next to every rate, never instead of it: two determinations can both
 * read 0% for unrelated reasons, and the treatment is the only thing on the
 * card that says which.
 */
const TREATMENT_LABEL: Record<TaxTreatment, string> = {
  domestic: "Domestic",
  oss_b2c: "OSS B2C",
  reverse_charge: "Reverse charge",
  out_of_scope: "Out of scope",
  undetermined_default: "Undetermined",
};

const TREATMENT_CLASS: Record<TaxTreatment, string> = {
  domestic: "border border-blue-500/40 bg-blue-500/10 text-blue-300",
  oss_b2c: "border border-purple-500/40 bg-purple-500/10 text-purple-300",
  reverse_charge: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  out_of_scope: "border border-slate-600 bg-slate-700/40 text-slate-300",
  // Amber: a fallback rate was applied because nothing identified the customer,
  // which is a data problem rather than a tax outcome.
  undetermined_default: "border border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
};

/** Why this determination came out the way it did, in the order it was decided. */
function evidence(d: AdminUserTaxDetermination): string {
  const parts: string[] = [];
  if (d.vat_number) parts.push(`customer VAT ${d.vat_number}`);
  if (d.place_of_supply) parts.push(`place of supply ${d.place_of_supply}`);
  if (d.declared_country) parts.push(`declared ${d.declared_country}`);
  if (d.geo_country) parts.push(`geo ${d.geo_country}`);
  return parts.join(" · ");
}

/**
 * What tax a user attracts right now, per seller company.
 *
 * One row per company because a rate is not a property of a user: the seller's
 * country is half of the rule, so the same customer is domestic to one company
 * and zero-rated by another.
 */
export function UserTaxSection({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const { data, loading, error } = useApiCall(() => adminApi.getUserTax(userId), [userId]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center space-x-3 mb-4">
        <ReceiptPercentIcon className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Tax treatment</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          Determining…
        </div>
      ) : error ? (
        // Inline rather than an ErrorState: the rest of the user page is still
        // useful when only this lookup fails.
        <div className="text-sm text-red-400">{error.message}</div>
      ) : !data || data.determinations.length === 0 ? (
        <div className="text-sm text-slate-500">No seller companies configured.</div>
      ) : (
        <div className="space-y-3">
          {/* An empty rate table zero-rates every country. Saying so is the
              difference between "no VAT is due" and "we do not know yet". */}
          {!data.rates_loaded && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs text-yellow-200">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                VAT rate table not loaded, so every rate below reads 0%. This is not a determination that no VAT is due
                — the treatments are still correct.
              </span>
            </div>
          )}

          {data.determinations.map((d) => (
            <div key={d.company_id} className="border-t border-gray-700 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-white" title={d.company_name}>
                    {d.company_name}
                    {d.seller_country && <span className="ml-1 text-xs text-slate-500">({d.seller_country})</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-sm font-medium text-white">{d.rate.toFixed(1)}%</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${TREATMENT_CLASS[d.treatment]}`}
                  >
                    {TREATMENT_LABEL[d.treatment] ?? d.treatment}
                  </span>
                </div>
              </div>
              {evidence(d) && <div className="mt-1 text-xs text-slate-500">{evidence(d)}</div>}
            </div>
          ))}

          <p className="border-t border-gray-700 pt-2 text-xs text-slate-500">
            What we would charge today. What was actually charged is on each payment.
          </p>
        </div>
      )}
    </div>
  );
}
