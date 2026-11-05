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

	// Step into the aisle, then walk east until a pen is in reach.
	await holdKeys(page, ["w"], 500);
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
