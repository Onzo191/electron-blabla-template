import { i18next } from "@renderer/i18n";
import { useAppStore } from "@renderer/store/useAppStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../shared/test/renderWithProviders";
import { SettingsDialog } from "./SettingsDialog";

const invoke = vi.fn();
vi.stubGlobal("api", { invoke, platform: "darwin" });

function ok(data: unknown) {
  return { ok: true, data };
}

describe("SettingsDialog", () => {
  beforeEach(async () => {
    invoke.mockReset();
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case "app:getVersion":
          return Promise.resolve(ok({ version: "1.2.3", platform: "darwin" }));
        case "app:getUpdateStatus":
          return Promise.resolve(
            ok({
              state: "not-available",
              currentVersion: "1.2.3",
              latestVersion: null,
              releaseNotesUrl: null,
              downloadProgress: null,
              isForced: false,
              errorMessage: null,
            }),
          );
        case "auth:getToken":
          return Promise.resolve(ok({ token: null }));
        default:
          return Promise.resolve(ok({}));
      }
    });
    useAppStore.setState({
      settingsOpen: true,
      settingsSection: "appearance",
      theme: "light",
    });
    document.documentElement.classList.remove("dark");
    await i18next.changeLanguage("en");
  });

  it("renders the dialog with its title when open", () => {
    renderWithProviders(<SettingsDialog />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    useAppStore.setState({ settingsOpen: false });
    renderWithProviders(<SettingsDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches the active section from the nav", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsDialog />);

    await user.click(screen.getByRole("button", { name: "Language" }));

    expect(useAppStore.getState().settingsSection).toBe("language");
  });

  it("applies dark theme immediately when selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsDialog />);

    await user.click(screen.getByRole("radio", { name: /dark/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
