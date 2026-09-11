import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/auth",
  "/upload",
  "/analysis/test-id",
  "/account",
  "/privacy",
];

for (const route of routes) {
  test(`${route} has no serious or critical accessibility violations`, async ({
    page,
  }) => {
    await page.goto(route);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const blockingViolations = violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact ?? ""),
    );

    expect(blockingViolations).toEqual([]);
  });
}
