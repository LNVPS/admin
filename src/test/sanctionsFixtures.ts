import type {
  AdminPaymentScreening,
  AdminSanctionsList,
  AdminSanctionsMatch,
  AdminSanctionsMatchDetail,
  AdminScreenUserResult,
} from "../lib/api";

export const LISTED_ADDRESS = "bc1qexamplelistedaddress0000000000000000000";

export const listsSample: { data: AdminSanctionsList[] } = {
  data: [
    {
      id: 2,
      source: "eu_fsf",
      version: "2025-06-01",
      sha256: "00",
      entry_count: 1,
      fetched: "2025-06-01T02:00:00Z",
      checked: "2025-06-02T02:00:00Z",
    },
    {
      id: 1,
      source: "ofac_sdn",
      version: "fixture",
      sha256: "00",
      entry_count: 2,
      fetched: "2025-06-01T02:00:00Z",
      checked: "2025-06-02T02:00:00Z",
    },
  ],
};

export function matchSample(overrides: Partial<AdminSanctionsMatch> = {}): AdminSanctionsMatch {
  return {
    id: 5,
    created: "2025-06-02T10:00:00Z",
    subject: "payment",
    user_id: 1,
    payment_ref: "txid:0",
    field: "address",
    subject_value: LISTED_ADDRESS,
    list_source: "ofac_sdn",
    list_version: "fixture",
    list_fetched: "2025-06-01T02:00:00Z",
    entry_id: "90001",
    entry_name: "TESTOV, Example Person",
    score: 1,
    status: "held",
    resolved_by: null,
    resolved_at: null,
    resolution_reason: null,
    ...overrides,
  };
}

export const screeningSample: AdminPaymentScreening = {
  id: 3,
  payment_ref: "txid:0",
  payment_id: null,
  user_id: 1,
  payment_method: "on_chain",
  mode: "screened",
  provider: "official_lists",
  result: null,
  held: true,
  source_addresses: [LISTED_ADDRESS],
  amount_msat: 1000,
  created: "2025-06-02T10:00:00Z",
  released_at: null,
};

export const matchesSample = {
  data: [matchSample(), matchSample({ id: 6, subject: "user", payment_ref: null, field: "name", status: "review", score: 0.93 })],
  total: 2,
  limit: 20,
  offset: 0,
};

export const matchDetailSample: { data: AdminSanctionsMatchDetail } = {
  data: { ...matchSample(), screening: screeningSample, orders_held: null },
};

export const userMatchDetailSample: { data: AdminSanctionsMatchDetail } = {
  data: {
    ...matchSample({ id: 6, subject: "user", payment_ref: null, field: "entity", status: "held" }),
    screening: null,
    orders_held: true,
  },
};

export const screeningsSample = { data: [screeningSample], total: 1, limit: 20, offset: 0 };

export const screenUserSample: { data: AdminScreenUserResult } = {
  data: { held: true, review: false, new_matches: [7] },
};
