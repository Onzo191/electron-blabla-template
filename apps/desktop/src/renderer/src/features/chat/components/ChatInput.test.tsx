import { i18next } from "@renderer/i18n";
import { useAppStore } from "@renderer/store/useAppStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../shared/test/renderWithProviders";
import { ChatInput } from "./ChatInput";

function resetChatState(): void {
  useAppStore.setState({
    selectedAgent: { id: "agent-1", name: "VNG Assistant" },
    drafts: {},
    streamStatus: "idle",
    webSearchEnabled: false,
  });
}

describe("ChatInput", () => {
  beforeEach(async () => {
    resetChatState();
    await i18next.changeLanguage("en");
  });

  it("sends the trimmed draft on Enter and clears it", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderWithProviders(<ChatInput draftKey="c1" onSend={onSend} />);

    const textarea = screen.getByRole("textbox", { name: /ask anything/i });
    await user.type(textarea, "  hello there  ");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello there");
    expect(useAppStore.getState().drafts.c1).toBe("");
  });

  it("inserts a newline on Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderWithProviders(<ChatInput draftKey="c1" onSend={onSend} />);

    const textarea = screen.getByRole("textbox", { name: /ask anything/i });
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "line two");

    expect(onSend).not.toHaveBeenCalled();
    expect(useAppStore.getState().drafts.c1).toBe("line one\nline two");
  });

  it("disables send when no agent is selected", async () => {
    useAppStore.setState({ selectedAgent: null });
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderWithProviders(<ChatInput draftKey="c1" onSend={onSend} />);

    const textarea = screen.getByRole("textbox", { name: /ask anything/i });
    await user.type(textarea, "hello{Enter}");
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("swaps to a working stop button while streaming", async () => {
    useAppStore.setState({ streamStatus: "streaming" });
    const cancel = vi.fn();
    useAppStore.setState({ cancelStreaming: cancel });
    const user = userEvent.setup();
    renderWithProviders(<ChatInput draftKey="c1" onSend={vi.fn()} />);

    const stop = screen.getByRole("button", { name: /stop generating/i });
    await user.click(stop);
    expect(cancel).toHaveBeenCalled();
  });

  it("toggles web search with pressed state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatInput draftKey="c1" onSend={vi.fn()} />);

    const toggle = screen.getByRole("button", { name: /web search/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(useAppStore.getState().webSearchEnabled).toBe(true);
  });
});
