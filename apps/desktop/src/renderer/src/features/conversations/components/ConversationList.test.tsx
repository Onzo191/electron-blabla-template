import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../../../tests/msw/server";
import { renderWithProviders } from "../../../shared/test/renderWithProviders";
import { ConversationList } from "./ConversationList";

const API_BASE = "http://localhost:4000";

describe("ConversationList", () => {
  it("renders conversations fetched from the backend", async () => {
    server.use(
      http.get(`${API_BASE}/conversations`, () =>
        HttpResponse.json([
          { id: "1", title: "Weekly planning", updatedAt: "2026-07-01" },
          { id: "2", title: "Bug triage", updatedAt: "2026-07-02" },
        ]),
      ),
    );

    renderWithProviders(<ConversationList />);

    await waitFor(() => {
      expect(screen.getByRole("list")).toBeInTheDocument();
    });
    expect(screen.getByText("Weekly planning")).toBeInTheDocument();
    expect(screen.getByText("Bug triage")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(
        `${API_BASE}/conversations`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithProviders(<ConversationList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load conversations.",
    );
  });
});
