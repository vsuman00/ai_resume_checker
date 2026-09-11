/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ResultTabs from "../../app/components/ResultTabs";

const content = {
  overview: <p>Overview content</p>,
  evidence: <p>Evidence content</p>,
  parse: <p>Parse content</p>,
  keywords: <p>Keyword content</p>,
  rewrite: <p>Rewrite content</p>,
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("ResultTabs", () => {
  it("switches tabs with click and arrow-key navigation", async () => {
    const user = userEvent.setup();

    render(<ResultTabs content={content} />);

    const evidenceTab = screen.getByRole("tab", { name: "ATS evidence" });
    await user.click(evidenceTab);

    expect(evidenceTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Evidence content",
    );
    expect(window.location.hash).toBe("#evidence");

    evidenceTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen
        .getByRole("tab", { name: "Parse view" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("Parse content");
    expect(window.location.hash).toBe("#parse");
  });

  it("selects a valid section from the URL hash", async () => {
    window.history.replaceState(null, "", "#keywords");

    render(<ResultTabs content={content} />);

    await waitFor(() =>
      expect(
        screen
          .getByRole("tab", { name: "Keywords" })
          .getAttribute("aria-selected"),
      ).toBe("true"),
    );
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Keyword content",
    );
  });
});
