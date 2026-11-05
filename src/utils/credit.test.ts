import { describe, expect, it } from "vitest";
import type { AdminAccountCredit } from "../lib/api";
import { creditBalances, creditDeltaMinor } from "./credit";

const base: AdminAccountCredit = { user_id: 1, balance: 5000, currency: "BTC", auto_apply: true };

describe("creditBalances", () => {
  it("lists every currency with the base currency first", () => {
    const rows = creditBalances({
      ...base,
      balances: [
        { currency: "EUR", balance: 1200 },
        { currency: "BTC", balance: 5000 },
        { currency: "USD", balance: 300 },
      ],
    });
    expect(rows.map((r) => r.currency)).toEqual(["BTC", "EUR", "USD"]);
  });

  it("falls back to the single base balance when the API sends no list", () => {
    expect(creditBalances(base)).toEqual([{ currency: "BTC", balance: 5000 }]);
  });

  it("shows a zero base row when only other currencies are held", () => {
    const rows = creditBalances({ ...base, balance: 0, balances: [{ currency: "EUR", balance: 1200 }] });
    expect(rows).toEqual([
      { currency: "BTC", balance: 0 },
      { currency: "EUR", balance: 1200 },
    ]);
  });
});

describe("creditDeltaMinor", () => {
  it("converts sats to msat and fiat to cents with the sign of the direction", () => {
    expect(creditDeltaMinor(10, "grant", "BTC")).toBe(10000);
    expect(creditDeltaMinor(10.5, "clawback", "EUR")).toBe(-1050);
  });
});
