import "@renderer/i18n";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../shared/test/renderWithProviders";
import type { ChatActions } from "./ChatActionsContext";
import { ChatActionsProvider } from "./ChatActionsContext";
import { MessageSegments } from "./MessageSegments";

const actions: ChatActions = {
  submitMessage: vi.fn(),
  prefillInput: vi.fn(),
  openLightbox: vi.fn(),
  copyToClipboard: vi.fn(),
};

function renderSegments(text: string, isLastMessage = true) {
  return renderWithProviders(
    <ChatActionsProvider value={actions}>
      <MessageSegments text={text} isLastMessage={isLastMessage} />
    </ChatActionsProvider>,
  );
}

describe("MessageSegments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders markdown prose", () => {
    renderSegments("# Benefits\n\nThe **2024** policy covers dental.");
    expect(
      screen.getByRole("heading", { name: "Benefits" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("submits a suggestion chip's text when clicked", async () => {
    const user = userEvent.setup();
    renderSegments(
      'Intro\n====SUGGESTIONS====\n{"items":["Parking guide"]}\n====END_SUGGESTIONS====',
    );
    await user.click(screen.getByRole("button", { name: "Parking guide" }));
    expect(actions.submitMessage).toHaveBeenCalledWith("Parking guide");
  });

  it("hides suggestion chips on non-final messages", () => {
    renderSegments(
      '====SUGGESTIONS====\n{"items":["Parking guide"]}\n====END_SUGGESTIONS====',
      false,
    );
    expect(
      screen.queryByRole("button", { name: "Parking guide" }),
    ).not.toBeInTheDocument();
  });

  it("renders a colleague card and submits the manager lookup prompt", async () => {
    const user = userEvent.setup();
    renderSegments(
      [
        "====ASK_COLLEAGUES_TOOL====",
        '{"data":{"name":"Jane Doe","title":"Engineer","lineManager":"John Smith"}}',
        "====END_ASK_COLLEAGUES_TOOL====",
      ].join("\n"),
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /John Smith/ }));
    expect(actions.submitMessage).toHaveBeenCalledWith(
      expect.stringContaining("John Smith"),
    );
  });

  it("opens the lightbox from a media tile", async () => {
    const user = userEvent.setup();
    renderSegments(
      [
        "====MEDIA====",
        '{"items":[{"url":"https://x/a.png","alt":"Campus","mediaType":"image"}]}',
        "====END_MEDIA====",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Campus" }));
    expect(actions.openLightbox).toHaveBeenCalledWith(
      [expect.objectContaining({ url: "https://x/a.png" })],
      0,
    );
  });

  it("renders numbered references with safe external links", () => {
    renderSegments(
      [
        "====REFERENCES====",
        '{"items":[{"title":"Handbook 2024","url":"https://drive/handbook.pdf"}]}',
        "====END_REFERENCES====",
      ].join("\n"),
    );
    const link = screen.getByRole("link", { name: /Handbook 2024/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("silently skips a widget with malformed JSON", () => {
    renderSegments("before\n====MEDIA====\n{broken\n====END_MEDIA====\nafter");
    expect(screen.getByText("before")).toBeInTheDocument();
    expect(screen.getByText("after")).toBeInTheDocument();
  });

  it("submits an export command from the format picker", async () => {
    const user = userEvent.setup();
    renderSegments(
      '====EXPORT_FORMAT_PICKER====\n{"availableFormats":["pdf"]}\n====END_EXPORT_FORMAT_PICKER====',
    );
    await user.click(screen.getByRole("button", { name: "PDF" }));
    expect(actions.submitMessage).toHaveBeenCalledWith("Export as PDF");
  });
});
