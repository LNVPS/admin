import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LISTED_ADDRESS, screeningSample } from "../test/sanctionsFixtures";
import { PaymentScreening } from "./PaymentScreening";

function renderRows(rows?: (typeof screeningSample)[]) {
  return render(
    <MemoryRouter>
      <PaymentScreening rows={rows} />
    </MemoryRouter>,
  );
}

describe("PaymentScreening", () => {
  it("renders nothing when the API returned no screening rows", () => {
    const { container } = renderRows(undefined);
    expect(container.firstChild).toBeNull();
    expect(renderRows([]).container.firstChild).toBeNull();
  });

  it("shows a held row with its paying address and a review link", () => {
    renderRows([screeningSample]);
    expect(screen.getByText("Held")).toBeTruthy();
    expect(screen.getByText(LISTED_ADDRESS)).toBeTruthy();
    expect(screen.getByText("1 sats")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review matches" }).getAttribute("href")).toContain("payment_ref=txid%3A0");
  });

  it("shows a released row without a review link", () => {
    renderRows([{ ...screeningSample, held: false, released_at: "2025-06-03T10:00:00Z" }]);
    expect(screen.getByText("Released")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Review matches" })).toBeNull();
  });
});
