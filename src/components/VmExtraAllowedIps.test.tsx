import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminVmExtraAllowedIp } from "../lib/api";
import { AdminApi } from "../lib/api";
import { LoginState } from "../lib/login";
import { ConfirmDialogContainer } from "./ConfirmDialogContainer";
import { VmExtraAllowedIps } from "./VmExtraAllowedIps";

interface Call {
  method: string;
  path: string;
  body: unknown;
}

const API = "http://api.test";
let calls: Call[];
let rows: AdminVmExtraAllowedIp[];
let postError: string | null;

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
  postError = null;
  rows = [
    {
      id: 1,
      vm_id: 2069,
      ip: "185.18.221.135",
      comment: "k8s ingress VIP",
      created: "2026-11-24T15:30:00Z",
    },
  ];
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
      if (call.method === "GET") return json(200, { data: rows });
      if (call.method === "POST") {
        if (postError) return json(409, { error: postError });
        const body = call.body as { ip: string; comment: string };
        const row = { id: rows.length + 10, vm_id: 2069, created: "2026-11-24T16:00:00Z", ...body };
        rows = [...rows, row];
        return json(200, { data: row });
      }
      if (call.method === "DELETE") {
        const id = Number(call.path.split("/").pop());
        rows = rows.filter((r) => r.id !== id);
        return json(200, { data: null });
      }
      return json(404, { error: "unexpected" });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderPanel() {
  return render(
    <>
      <VmExtraAllowedIps vmId={2069} />
      <ConfirmDialogContainer />
    </>,
  );
}

describe("VmExtraAllowedIps", () => {
  it("lists the entries with their comment and hides editing without update permission", async () => {
    grant(["virtual_machines::view"]);
    renderPanel();
    await screen.findByText("185.18.221.135");
    expect(screen.getByText("k8s ingress VIP")).toBeTruthy();
    expect(screen.queryByLabelText("Address")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove 185.18.221.135" })).toBeNull();
    expect(calls[0]).toMatchObject({ method: "GET", path: "/api/admin/v1/vms/2069/extra_allowed_ips" });
  });

  it("adds an address and shows it", async () => {
    grant(["virtual_machines::view", "virtual_machines::update"]);
    renderPanel();
    await screen.findByText("185.18.221.135");
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: " 2a13:2c0::4dbc:733d:4d68:2e08 " } });
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "k8s ingress VIP" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("2a13:2c0::4dbc:733d:4d68:2e08");
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toEqual({ ip: "2a13:2c0::4dbc:733d:4d68:2e08", comment: "k8s ingress VIP" });
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("");
  });

  it("shows the refusal when the address belongs to another user", async () => {
    grant(["virtual_machines::view", "virtual_machines::update"]);
    postError = "10.0.0.5 is assigned to VM 12 of another user";
    renderPanel();
    await screen.findByText("185.18.221.135");
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "10.0.0.5" } });
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText(postError);
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("10.0.0.5");
  });

  it("removes an entry after confirming", async () => {
    grant(["virtual_machines::view", "virtual_machines::update"]);
    renderPanel();
    await screen.findByText("185.18.221.135");
    fireEvent.click(screen.getByRole("button", { name: "Remove 185.18.221.135" }));
    const dialog = await screen.findByText("Remove allowed IP");
    fireEvent.click(within(dialog.closest("[role=dialog]") ?? document.body).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.getByText("None.")).toBeTruthy());
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/api/admin/v1/vms/2069/extra_allowed_ips/1")).toBe(
      true,
    );
  });
});
