import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogContainer } from "../components/ConfirmDialogContainer";
import { AdminApi } from "../lib/api";
import { LoginState } from "../lib/login";
import {
  listsSample,
  matchDetailSample,
  matchesSample,
  screeningsSample,
  userMatchDetailSample,
} from "../test/sanctionsFixtures";
import { SanctionMatchDetailPage } from "./SanctionMatchDetailPage";
import { SanctionsPage } from "./SanctionsPage";

interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

let calls: Call[];
let matches: unknown;
let detail: unknown;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function grant(permissions: string[]) {
  vi.spyOn(LoginState, "getRoles").mockReturnValue([
    {
      role: { id: 1, name: "ops", permissions } as never,
      assigned_at: "",
      assigned_by: null,
      expires_at: null,
      is_active: true,
    } as never,
  ]);
}

beforeEach(() => {
  calls = [];
  matches = matchesSample;
  detail = matchDetailSample;
  vi.spyOn(AdminApi.prototype as unknown as { auth: () => Promise<string> }, "auth").mockResolvedValue("Nostr test");
  localStorage.setItem("lnvps_admin_server_config", JSON.stringify({ currentServer: "http://api.test" }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      const call: Call = {
        method: init?.method ?? "GET",
        path: url.pathname,
        query: url.searchParams,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      };
      calls.push(call);
      if (call.path === "/api/admin/v1/sanctions/matches") return json(200, matches);
      if (call.path === "/api/admin/v1/sanctions/screenings") return json(200, screeningsSample);
      if (call.path === "/api/admin/v1/sanctions/lists/refresh") return json(200, { data: null });
      if (call.path === "/api/admin/v1/sanctions/lists") return json(200, listsSample);
      if (call.path.endsWith("/clear") || call.path.endsWith("/confirm")) {
        return json(200, { data: { ...(detail as { data: object }).data, status: "cleared" } });
      }
      if (call.path.startsWith("/api/admin/v1/sanctions/matches/")) return json(200, detail);
      return json(404, { error: "unexpected" });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderQueue() {
  return render(
    <MemoryRouter>
      <SanctionsPage />
    </MemoryRouter>,
  );
}

function renderDetail(id = 5) {
  return render(
    <MemoryRouter initialEntries={[`/sanctions/matches/${id}`]}>
      <Routes>
        <Route path="/sanctions/matches/:id" element={<SanctionMatchDetailPage />} />
      </Routes>
      <ConfirmDialogContainer />
    </MemoryRouter>,
  );
}

describe("SanctionsPage queue", () => {
  it("renders the open matches with list source, entry, score and status", async () => {
    grant(["sanctions::view"]);
    renderQueue();
    await screen.findByText("TESTOV, Example Person");
    expect(calls.find((c) => c.path.endsWith("/matches"))?.query.get("open")).toBe("true");
    const row = screen.getByText("TESTOV, Example Person").closest("tr") as HTMLElement;
    expect(within(row).getByText("ofac_sdn fixture")).toBeTruthy();
    expect(within(row).getByText("1.00")).toBeTruthy();
    expect(within(row).getByText("Held")).toBeTruthy();
    expect(screen.getByText("0.93")).toBeTruthy();
  });

  it("sends the status, subject, user and payment filters", async () => {
    grant(["sanctions::view"]);
    renderQueue();
    await screen.findByText("TESTOV, Example Person");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "cleared" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "payment" } });
    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "txid:0" } });
    await waitFor(() => {
      const last = [...calls].reverse().find((c) => c.path.endsWith("/matches"));
      expect(last?.query.get("status")).toBe("cleared");
      expect(last?.query.get("subject")).toBe("payment");
      expect(last?.query.get("user_id")).toBe("9");
      expect(last?.query.get("payment_ref")).toBe("txid:0");
      expect(last?.query.get("open")).toBeNull();
    });
  });

  it("shows an empty state when nothing is open", async () => {
    grant(["sanctions::view"]);
    matches = { data: [], total: 0, limit: 20, offset: 0 };
    renderQueue();
    await screen.findByText("No sanctions matches");
  });

  it("lists held deposits with their paying addresses", async () => {
    grant(["sanctions::view"]);
    renderQueue();
    fireEvent.click(await screen.findByRole("button", { name: "Held deposits" }));
    await screen.findByText("txid:0");
    expect(calls.some((c) => c.path.endsWith("/screenings") && c.query.get("held") === "true")).toBe(true);
    expect(screen.getByText("bc1qexamplelistedaddress0000000000000000000")).toBeTruthy();
  });

  it("shows list versions and hides Refresh without update permission", async () => {
    grant(["sanctions::view"]);
    renderQueue();
    fireEvent.click(await screen.findByRole("button", { name: "Lists" }));
    await screen.findByText("eu_fsf");
    expect(screen.getByText("ofac_sdn")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Refresh lists" })).toBeNull();
  });

  it("queues a refresh with update permission", async () => {
    grant(["sanctions::view", "sanctions::update"]);
    renderQueue();
    fireEvent.click(await screen.findByRole("button", { name: "Lists" }));
    fireEvent.click(await screen.findByRole("button", { name: "Refresh lists" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path.endsWith("/lists/refresh"))).toBe(true));
  });
});

describe("SanctionMatchDetailPage", () => {
  it("hides Clear and Confirm without update permission", async () => {
    grant(["sanctions::view"]);
    renderDetail();
    await screen.findByText("TESTOV, Example Person");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  });

  it("requires a reason to clear and sends it", async () => {
    grant(["sanctions::view", "sanctions::update"]);
    renderDetail();
    await screen.findByText("TESTOV, Example Person");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    const submit = (await screen.findByRole("button", { name: "Clear match" })) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText(/credited exactly once/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "exchange hot wallet" } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST");
      expect(post?.path).toBe("/api/admin/v1/sanctions/matches/5/clear");
      expect(post?.body).toEqual({ reason: "exchange hot wallet" });
    });
  });

  it("requires a reason to confirm", async () => {
    grant(["sanctions::view", "sanctions::update"]);
    renderDetail();
    await screen.findByText("TESTOV, Example Person");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    const submit = (await screen.findByRole("button", { name: "Confirm match" })) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "matches the entry" } });
    fireEvent.click(submit);
    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST");
      expect(post?.path).toBe("/api/admin/v1/sanctions/matches/5/confirm");
      expect(post?.body).toEqual({ reason: "matches the entry" });
    });
  });

  it("shows the held deposit screening row for a payment match", async () => {
    grant(["sanctions::view"]);
    renderDetail();
    await screen.findByText("Held deposit");
    expect(screen.getAllByText("bc1qexamplelistedaddress0000000000000000000").length).toBeGreaterThan(0);
  });

  it("shows orders_held for a user match", async () => {
    grant(["sanctions::view"]);
    detail = userMatchDetailSample;
    renderDetail(6);
    await screen.findByText("New orders are on hold");
  });

  it("shows who resolved a match and why", async () => {
    grant(["sanctions::view"]);
    detail = {
      data: {
        ...matchDetailSample.data,
        status: "cleared",
        resolved_by: 77,
        resolved_at: "2025-06-03T10:00:00Z",
        resolution_reason: "exchange hot wallet",
      },
    };
    renderDetail();
    await screen.findByText("exchange hot wallet");
    expect(screen.getByText("Admin #77", { exact: false })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
