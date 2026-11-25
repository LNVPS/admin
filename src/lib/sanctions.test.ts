import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listsSample,
  matchDetailSample,
  matchesSample,
  screenUserSample,
  screeningsSample,
  userMatchDetailSample,
} from "../test/sanctionsFixtures";
import { AdminApi } from "./api";

interface Call {
  method: string;
  path: string;
  query: string;
  body: unknown;
}

let calls: Call[];
let reply: unknown;

beforeEach(() => {
  calls = [];
  vi.spyOn(AdminApi.prototype as unknown as { auth: () => Promise<string> }, "auth").mockResolvedValue("Nostr test");
  localStorage.setItem("lnvps_admin_server_config", JSON.stringify({ currentServer: "http://api.test" }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      calls.push({
        method: init?.method ?? "GET",
        path: url.pathname,
        query: url.search,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      return new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function api(): AdminApi {
  return new AdminApi();
}

describe("sanctions api", () => {
  it("parses the lists response", async () => {
    reply = listsSample;
    const lists = await api().getSanctionsLists();
    expect(lists.map((l) => l.source)).toEqual(["eu_fsf", "ofac_sdn"]);
    expect(lists[1].entry_count).toBe(2);
  });

  it("parses the matches page and sends the filters", async () => {
    reply = matchesSample;
    const page = await api().getSanctionsMatches({ open: true, status: "held", user_id: 1, limit: 20, offset: 0 });
    expect(page.total).toBe(2);
    expect(page.data[1].status).toBe("review");
    expect(calls[0].path).toBe("/api/admin/v1/sanctions/matches");
    expect(calls[0].query).toContain("open=true");
    expect(calls[0].query).toContain("status=held");
    expect(calls[0].query).toContain("user_id=1");
  });

  it("parses a payment match detail with its screening row", async () => {
    reply = matchDetailSample;
    const m = await api().getSanctionsMatch(5);
    expect(m.screening?.held).toBe(true);
    expect(m.screening?.source_addresses).toHaveLength(1);
    expect(m.orders_held).toBeNull();
  });

  it("parses a user match detail with orders_held", async () => {
    reply = userMatchDetailSample;
    const m = await api().getSanctionsMatch(6);
    expect(m.screening).toBeNull();
    expect(m.orders_held).toBe(true);
  });

  it("posts the reason to clear and confirm", async () => {
    reply = matchDetailSample;
    await api().clearSanctionsMatch(5, "checked");
    await api().confirmSanctionsMatch(5, "verified");
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/admin/v1/sanctions/matches/5/clear" });
    expect(calls[0].body).toEqual({ reason: "checked" });
    expect(calls[1]).toMatchObject({ method: "POST", path: "/api/admin/v1/sanctions/matches/5/confirm" });
    expect(calls[1].body).toEqual({ reason: "verified" });
  });

  it("parses the screenings page", async () => {
    reply = screeningsSample;
    const page = await api().getSanctionsScreenings({ held: true });
    expect(page.data[0].amount_msat).toBe(1000);
    expect(calls[0].query).toContain("held=true");
  });

  it("parses the screen user result", async () => {
    reply = screenUserSample;
    const out = await api().screenUser(1);
    expect(out).toEqual({ held: true, review: false, new_matches: [7] });
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/admin/v1/sanctions/users/1/screen" });
  });

  it("queues a refresh", async () => {
    reply = { data: null };
    await api().refreshSanctionsLists();
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/admin/v1/sanctions/lists/refresh" });
  });
});
