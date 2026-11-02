import { expect, test } from "@playwright/test";
import { clickFarmTile, register, resetServer, uniqueName } from "./helpers";

const OUT = "/private/var/folders/9f/9b8t0_b56_bd3_w_1msz_r040000gn/T/opencode";

test("visual check: wider vertical gate, rail lift, far-post layer", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("GateVis2"));

	await page.keyboard.press("6");
	await clickFarmTile(page, 8, 7);
	await clickFarmTile(page, 8, 9);
	await page.waitForTimeout(400);

	await page.keyboard.press("5");
	await clickFarmTile(page, 8, 8);
	await page.waitForTimeout(600);

	const prompt = page.getByTestId("travel-prompt");
	await expect(prompt).toContainText("open gate");
	await page.locator("canvas.farm-map-canvas").screenshot({
		path: `${OUT}/vg2-closed-north.png`,
	});

	await page.keyboard.press("e");
	await page.waitForTimeout(600);
	await expect(prompt).toContainText("close gate");
	await page.locator("canvas.farm-map-canvas").screenshot({
		path: `${OUT}/vg2-open-north.png`,
	});
});

test("visual check: south-pointing vertical gate hinge", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("GateVisSouth"));

	await page.keyboard.press("6");
	await clickFarmTile(page, 8, 9);
	await page.waitForTimeout(400);

	await page.keyboard.press("5");
	await clickFarmTile(page, 8, 8);
	await page.waitForTimeout(600);

	await page.locator("canvas.farm-map-canvas").screenshot({
		path: `${OUT}/vg2-closed-south.png`,
	});
});
