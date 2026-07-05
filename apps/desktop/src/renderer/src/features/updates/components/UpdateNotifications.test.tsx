import type { UpdateStatus } from "@myvng/shared";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../shared/test/renderWithProviders";
import { UpdateNotifications } from "./UpdateNotifications";

const invoke = vi.fn();

vi.stubGlobal("api", { invoke });

function status(overrides: Partial<UpdateStatus>): UpdateStatus {
  return {
    state: "idle",
    currentVersion: "1.0.0",
    latestVersion: null,
    releaseNotesUrl: null,
    downloadProgress: null,
    isForced: false,
    errorMessage: null,
    ...overrides,
  };
}

describe("UpdateNotifications", () => {
  afterEach(() => {
    invoke.mockClear();
  });

  it("renders nothing when no update is available", async () => {
    invoke.mockResolvedValue({
      ok: true,
      data: status({ state: "not-available" }),
    });

    renderWithProviders(<UpdateNotifications />);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a dismissable banner when an update is available", async () => {
    invoke.mockResolvedValue({
      ok: true,
      data: status({ state: "available", latestVersion: "1.1.0" }),
    });

    renderWithProviders(<UpdateNotifications />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Update 1.1.0 available",
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("shows a non-dismissable dialog when the update is forced", async () => {
    invoke.mockResolvedValue({
      ok: true,
      data: status({
        state: "available",
        latestVersion: "2.0.0",
        isForced: true,
      }),
    });

    renderWithProviders(<UpdateNotifications />);

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Update required",
    );
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });
});
