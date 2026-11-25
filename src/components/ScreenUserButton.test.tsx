import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApi } from "../lib/api";
import { LoginState } from "../lib/login";
import { toastService } from "../services/toastService";
import { screenUserSample } from "../test/sanctionsFixtures";
import { PermissionGuard } from "./PermissionGuard";
import { ScreenUserButton } from "./ScreenUserButton";

interface Call {
  method: string;
  path: string;
}

let calls: Call[];

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
  vi.spyOn(AdminApi.prototype as unknown as { auth: () => Promise<string> }, "auth").mockResolvedValue("Nostr test");
  localStorage.setItem("lnvps_admin_server_config", JSON.stringify({ currentServer: "http://api.test" }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", path: new URL(input).pathname });
      return new Response(JSON.stringify(screenUserSample), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderButton() {
  return render(
    <>
      <PermissionGuard requiredPermissions={["sanctions::update"]} fallback={<></>}>
        <ScreenUserButton userId={42} />
      </PermissionGuard>
    </>,
  );
}

describe("ScreenUserButton", () => {
  it("is hidden without sanctions::update", () => {
    grant(["sanctions::view"]);
    renderButton();
    expect(screen.queryByRole("button", { name: /Screen now/ })).toBeNull();
  });

  it("calls the screen endpoint and shows the result", async () => {
    grant(["sanctions::update"]);
    const success = vi.spyOn(toastService, "success");
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Screen now/ }));
    await waitFor(() => expect(calls).toEqual([{ method: "POST", path: "/api/admin/v1/sanctions/users/42/screen" }]));
    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(success.mock.calls[0][1]).toContain("Orders are on hold");
    expect(success.mock.calls[0][1]).toContain("New matches: 1");
  });
});
