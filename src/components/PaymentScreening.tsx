import { Link } from "react-router-dom";
import type { AdminPaymentScreening } from "../lib/api";
import { formatMsatAsSats } from "../utils/sanctions";
import { Pill } from "./Pill";

export function PaymentScreening({ rows }: { rows?: AdminPaymentScreening[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1 text-xs" data-testid="payment-screening">
      {rows.map((s) => (
        <div key={s.id} className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500">Screening</span>
            <Pill variant={s.released_at ? "success" : s.held ? "danger" : "default"} size="sm">
              {s.released_at ? "Released" : s.held ? "Held" : "Passed"}
            </Pill>
            <span className="text-slate-400">{s.mode}</span>
            <span className="text-slate-400">{formatMsatAsSats(s.amount_msat)}</span>
          </div>
          {s.source_addresses.map((a) => (
            <div key={a} className="max-w-[16rem] truncate font-mono text-slate-300" title={a}>
              {a}
            </div>
          ))}
          {s.held && (
            <Link
              to={`/sanctions?payment_ref=${encodeURIComponent(s.payment_ref)}`}
              className="text-blue-400 hover:underline"
            >
              Review matches
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
