import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogContainer } from "../components/ConfirmDialogContainer";
import type { AdminPaymentMethodConfigInfo } from "../lib/api";
import { AdminApi, AdminPaymentMethod, PaymentProviderType } from "../lib/api";
import { GATEWAY_ENABLE_GUARD } from "../utils/gateway";
import { PaymentMethodsPage } from "./PaymentMethodsPage";

interface Call {
  method: string;
  path: string;
  body: unknown;
}

type Handler = (call: Call) => { status: number; body: unknown } | undefined;

const API = "http://api.test";

function gatewayRow(overrides: Partial<AdminPaymentMethodConfigInfo> = {}): AdminPaymentMethodConfigInfo {
  return {
    id: 7,
    company_id: 1,
    company_name: "LNVPS",
    payment_method: AdminPaymentMethod.GATEWAY,
    name: "Main gateway",
    enabled: false,
    provider_type: PaymentProviderType.GATEWAY,
    config: {
      type: "gateway",
      url: "https://pay.example",
      tolerance_seconds: 300,
      off_session_renewals: "off",
      handles: ["lightning", "revolut"],
      has_api_key: true,
      has_webhook_secret: true,
    },
    processing_fee_rate: null,
    processing_fee_base: null,
    processing_fee_currency: null,
    supported_currencies: [],
    min_amount: null,
    min_amount_currency: null,
    created: "2025-11-24T00:00:00Z",
    modified: "2025-11-24T00:00:00Z",
    ...overrides,
  };
}

let calls: Call[];
let rows: AdminPaymentMethodConfigInfo[];
let extra: Handler;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  calls = [];
  rows = [gatewayRow()];
  extra = () => undefined;
  vi.spyOn(AdminApi.prototype as unknown as { auth: () => Promise<string> }, "auth").mockResolvedValue("Nostr test");
  localStorage.setItem("lnvps_admin_server_config", JSON.stringify({ currentServer: API }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      const call: Call = {
        method: init?.method ?? "GET",
        path: url.pathname,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      };
      calls.push(call);
      const custom = extra(call);
      if (custom) return json(custom.status, custom.body);
      if (call.path === "/api/admin/v1/companies") {
        return json(200, { data: [{ id: 1, name: "LNVPS" }], total: 1, limit: 100, offset: 0 });
      }
      if (call.path === "/api/admin/v1/payment_methods" && call.method === "GET") {
        return json(200, { data: rows, total: rows.length, limit: 20, offset: 0 });
      }
      if (call.path.endsWith("/gateway/status")) {
        return json(200, {
          data: { enabled: false, handles: ["lightning"], last_paid_webhook_at: null, payments_last_24h: 3 },
        });
      }
      return json(200, { data: rows[0] });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderPage() {
  return render(
    <>
      <PaymentMethodsPage />
      <ConfirmDialogContainer />
    </>,
  );
}

async function openEdit() {
  renderPage();
  await screen.findByText("Main gateway");
  const row = screen.getByText("Main gateway").closest("tr") as HTMLElement;
  const buttons = within(row).getAllByRole("button");
  fireEvent.click(buttons[buttons.length - 2]);
  await screen.findByText("Edit Payment Method");
}

function submitButton(label: string): HTMLElement {
  return screen.getByRole("button", { name: label });
}

function lastWrite(): Call | undefined {
  return [...calls].reverse().find((c) => c.method === "PATCH" || c.method === "POST");
}

describe("PaymentMethodsPage gateway", () => {
  it("lists a gateway row with its handled methods and an enabled switch", async () => {
    renderPage();
    await screen.findByText("Main gateway");
    const chips = screen.getByTestId("gateway-handles");
    expect(within(chips).getByText("Lightning")).toBeTruthy();
    expect(within(chips).getByText("Revolut")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Enable Main gateway" }).getAttribute("aria-checked")).toBe("false");
  });

  it("renders the gateway form when the gateway type is picked", async () => {
    renderPage();
    await screen.findByText("Main gateway");
    fireEvent.click(screen.getByRole("button", { name: /Add Payment Method/ }));
    await screen.findByRole("button", { name: "Create Payment Method" });
    expect(screen.queryByTestId("gateway-config-form")).toBeNull();

    const methodSelect = screen.getByDisplayValue("Lightning");
    fireEvent.change(methodSelect, { target: { value: "gateway" } });

    const form = await screen.findByTestId("gateway-config-form");
    expect(within(form).getByLabelText("Gateway URL *")).toBeTruthy();
    expect(within(form).getByLabelText("API Key *")).toBeTruthy();
    expect(within(form).getByLabelText("Webhook Secret *")).toBeTruthy();
    expect(within(form).getByText(`${API}/api/v1/webhook/gateway`)).toBeTruthy();
    expect(within(form).getByText("refund.completed")).toBeTruthy();
    expect(screen.getAllByText(GATEWAY_ENABLE_GUARD).length).toBeGreaterThan(0);
  });

  it("does not resend a masked secret on edit", async () => {
    await openEdit();
    const apiKey = screen.getByLabelText("API Key *") as HTMLInputElement;
    expect(apiKey.value).toBe("");
    expect(apiKey.placeholder).toBe("••••••••");

    fireEvent.change(screen.getByLabelText("Gateway URL *"), { target: { value: "https://pay2.example" } });
    fireEvent.click(submitButton("Update Payment Method"));

    await waitFor(() => expect(lastWrite()?.method).toBe("PATCH"));
    const config = (lastWrite()?.body as { config: Record<string, unknown> }).config;
    expect(config.url).toBe("https://pay2.example");
    expect("api_key" in config).toBe(false);
    expect("webhook_secret" in config).toBe(false);
  });

  it("sends a typed secret on edit", async () => {
    await openEdit();
    fireEvent.change(screen.getByLabelText("Webhook Secret *"), { target: { value: "whsec_new" } });
    fireEvent.click(submitButton("Update Payment Method"));

    await waitFor(() => expect(lastWrite()?.method).toBe("PATCH"));
    const config = (lastWrite()?.body as { config: Record<string, unknown> }).config;
    expect(config.webhook_secret).toBe("whsec_new");
    expect("api_key" in config).toBe(false);
  });

  it("round trips the handled methods", async () => {
    await openEdit();
    const lightning = screen.getByRole("checkbox", { name: "Lightning" }) as HTMLInputElement;
    const revolut = screen.getByRole("checkbox", { name: "Revolut" }) as HTMLInputElement;
    const onchain = screen.getByRole("checkbox", { name: "On-chain (Bitcoin)" }) as HTMLInputElement;
    expect(lightning.checked).toBe(true);
    expect(revolut.checked).toBe(true);
    expect(onchain.checked).toBe(false);

    fireEvent.click(revolut);
    fireEvent.click(onchain);
    fireEvent.click(submitButton("Update Payment Method"));

    await waitFor(() => expect(lastWrite()?.method).toBe("PATCH"));
    const config = (lastWrite()?.body as { config: { handles: string[]; off_session_renewals: string } }).config;
    expect(config.handles).toEqual(["lightning", "onchain"]);
    expect(config.off_session_renewals).toBe("off");
  });

  it("asks before enabling and shows the one enabled gateway error next to the form", async () => {
    const message = "This company already has an enabled gateway payment method, disable it first";
    extra = (call) => (call.method === "PATCH" ? { status: 500, body: { error: message } } : undefined);
    await openEdit();
    fireEvent.click(screen.getByLabelText("Enabled"));
    fireEvent.click(submitButton("Update Payment Method"));

    await screen.findByText("Enable payment gateway");
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() => expect(screen.getAllByText(message).length).toBeGreaterThan(0));
    expect((lastWrite()?.body as { enabled: boolean }).enabled).toBe(true);
    expect(screen.getByText("Edit Payment Method")).toBeTruthy();
  });

  it("does not enable when the confirm is cancelled", async () => {
    renderPage();
    await screen.findByText("Main gateway");
    fireEvent.click(screen.getByRole("switch", { name: "Enable Main gateway" }));
    await screen.findByText("Enable payment gateway");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => {});
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("shows a passing gateway test in green", async () => {
    extra = (call) =>
      call.path.endsWith("/gateway/test")
        ? { status: 200, body: { data: { ok: true, message: "Connected, the gateway lists 4 payment methods" } } }
        : undefined;
    await openEdit();
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    const result = await screen.findByTestId("gateway-test-result");
    expect(result.textContent).toBe("Connected, the gateway lists 4 payment methods");
    expect(result.className).toContain("text-green-400");
    expect(calls.some((c) => c.method === "POST" && c.path === "/api/admin/v1/payment_methods/7/gateway/test")).toBe(
      true,
    );
  });

  it("shows a failing gateway test in red", async () => {
    extra = (call) =>
      call.path.endsWith("/gateway/test")
        ? {
            status: 200,
            body: { data: { ok: false, message: "Could not reach the gateway: connection refused" } },
          }
        : undefined;
    await openEdit();
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    const result = await screen.findByTestId("gateway-test-result");
    expect(result.textContent).toBe("Could not reach the gateway: connection refused");
    expect(result.className).toContain("text-red-400");
  });

  it("shows the gateway status panel", async () => {
    await openEdit();
    const panel = await screen.findByTestId("gateway-status");
    await waitFor(() => expect(within(panel).getByText("3")).toBeTruthy());
    expect(within(panel).getByText("None yet")).toBeTruthy();
  });
});
