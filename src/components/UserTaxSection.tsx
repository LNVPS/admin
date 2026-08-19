import { ChevronRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import type { AdminUserTaxDetermination, TaxTreatment } from "../lib/api";
import { Fact, FactGroup } from "./Facts";

/**
 * Labels for how a sale is treated.
 *
 * Always shown next to the rate, never instead of it: two determinations can
 * both read 0% for unrelated reasons, and the treatment is the only thing here
 * that says which.
 */
const TREATMENT_LABEL: Record<TaxTreatment, string> = {
  domestic: "Domestic",
  oss_b2c: "OSS B2C",
  reverse_charge: "Reverse charge",
  out_of_scope: "Out of scope",
  undetermined_default: "Undetermined",
};

const TREATMENT_CLASS: Record<TaxTreatment, string> = {
  domestic: "text-blue-300",
  oss_b2c: "text-purple-300",
  reverse_charge: "text-emerald-300",
  out_of_scope: "text-slate-400",
  // Amber: a fallback rate means nothing identified the customer, which is a
  // data problem rather than a tax outcome.
  undetermined_default: "text-yellow-300",
};

/** Why this determination came out the way it did, in the order it was decided. */
function evidence(d: AdminUserTaxDetermination): string {
  const parts: string[] = [];
  if (d.vat_number) parts.push(`customer VAT ${d.vat_number}`);
  if (d.place_of_supply) parts.push(`supply ${d.place_of_supply}`);
  if (d.declared_country) parts.push(`declared ${d.declared_country}`);
  if (d.geo_country) parts.push(`geo ${d.geo_country}`);
  return parts.join(" · ");
}

/**
 * What tax a user attracts right now, one line per seller company.
 *
 * A rate is not a property of a user — the seller's country is half of the rule
 * — so every company gets a line. The reasoning behind each is one click away
 * rather than always on screen: it is what you read when an invoice is being
 * disputed, not every time you open a customer.
 */
export function UserTaxFacts({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const { data, loading, error } = useApiCall(() => adminApi.getUserTax(userId), [userId]);
  const [showEvidence, setShowEvidence] = useState(false);

  // A disclosure, not a second heading: in the group's action slot a bare
  // uppercase word sits in exactly the same style as the band label and reads
  // as one. Sentence case plus a rotating chevron says "control".
  const toggle =
    data && data.determinations.length > 0 ? (
      <button
        type="button"
        onClick={() => setShowEvidence((s) => !s)}
        aria-expanded={showEvidence}
        className="flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-300"
      >
        <ChevronRightIcon
          className={`h-3 w-3 transition-transform motion-reduce:transition-none ${showEvidence ? "rotate-90" : ""}`}
        />
        Why
      </button>
    ) : null;

  return (
    <FactGroup label="Tax" action={toggle}>
      {loading ? (
        <Fact label="Rate">
          <span className="text-slate-500">Determining…</span>
        </Fact>
      ) : error ? (
        // Inline: the rest of the record is still worth reading when only this
        // lookup fails.
        <Fact label="Rate" span>
          <span className="text-red-400">{error.message}</span>
        </Fact>
      ) : !data || data.determinations.length === 0 ? (
        <Fact label="Rate">
          <span className="text-slate-600">No seller companies</span>
        </Fact>
      ) : (
        <>
          {/* An empty rate table zero-rates every country. Saying so is the
              difference between "no VAT is due" and "we do not know yet". */}
          {!data.rates_loaded && (
            <Fact label="Rates" span>
              <span className="flex items-start gap-1.5 text-yellow-300">
                <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Rate table not loaded — every rate below reads 0%, which is not a finding that no VAT is due.
              </span>
            </Fact>
          )}
          {/* Rows rather than label/value pairs: the company is the subject of
              each line, and a seller's name does not belong in the fixed label
              column the rest of the record uses. Sized to its content, because a
              company and its rate belong next to each other — spanning the grid
              parks them at opposite ends of the screen. It widens only when the
              evidence lines need the room. */}
          <div className={`${showEvidence ? "space-y-2 sm:col-span-2" : ""} max-w-sm`}>
            {data.determinations.map((d) => (
              <div key={d.company_id} className="py-0.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-slate-300" title={d.company_name}>
                    {d.company_name}
                    {d.seller_country && (
                      <span className="ml-1.5 font-mono text-xs text-slate-500">{d.seller_country}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className={`text-xs ${TREATMENT_CLASS[d.treatment]}`}>
                      {TREATMENT_LABEL[d.treatment] ?? d.treatment}
                    </span>
                    <span className="w-14 text-right font-mono tabular-nums text-white">{d.rate.toFixed(1)}%</span>
                  </span>
                </div>
                {/* Indented and rules back to its own row: an unindented line
                    between two rows reads as a caption for the one below it,
                    which is the wrong company. */}
                {showEvidence && evidence(d) && (
                  <div className="ml-3 border-l border-slate-700 pl-2 font-mono text-[11px] text-slate-500">
                    {evidence(d)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </FactGroup>
  );
}
