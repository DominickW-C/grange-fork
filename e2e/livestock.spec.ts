import { expect, test } from "@playwright/test";
import {
	expectArea,
	holdKeys,
	registerFast,
	uniqueName,
	useDoor,
	waitForWorld,
	walkToLivestock,
	walkUntilPrompt,
} from "./helpers";

test("enter the livestock market and buy a pig from its pen", async ({
	page,
}) => {
	await registerFast(page, uniqueName("Rancher"), { area: "marketplace" });

	await walkToLivestock(page);
	await useDoor(page);
	await expectArea(page, /^Livestock Market map/, 10_000);

	// Step into the lower aisle (level with the pig's approach point), then walk
	// east until its pen is in reach. The hold is timed because the upper pens
	// block the aisle before any prompt appears; at 3x walking it needs about a
	// third of the old 2x distance.
	await holdKeys(page, ["w"], 300);
	await walkUntilPrompt(page, ["d"], "buy a pig");
	await useDoor(page);

	const purchase = page.getByTestId("livestock-purchase");
	await expect(purchase).toBeVisible();
	await expect(purchase).toContainText("$55");
	await page.getByTestId("livestock-buy").click();
	await expect(purchase).toContainText("Pig purchased!");
	await expect(page.getByTestId("farm-balance")).toContainText("45");
	await expect(page.getByTestId("livestock-owned")).toHaveText("1");

	await page.reload();
	await waitForWorld(page);
	await expect(page.getByTestId("farm-balance")).toContainText("45");
	await page.getByTestId("open-inventory").click();
	await expect(
		page.getByTestId("inventory-panel").locator('[data-item="pig"]'),
	).toHaveCount(1);
});
