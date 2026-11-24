import { expect, test } from "@playwright/test";
import {
	clickWorld,
	movePlayerNear,
	registerFast,
	tapFarmTile,
	uniqueName,
} from "./helpers";

test("greenhouse interaction: place, open with E or click, deposit seed, grow, collect output", async ({
	page,
}) => {
	await registerFast(page, uniqueName("Botanist"));

	// Select greenhouse in hotbar and place it on clear ground at (8, 6)
	const greenhouseSlot = page.locator('[data-item="greenhouse"]');
	await expect(greenhouseSlot).toHaveCount(1);
	await greenhouseSlot.click();
	await tapFarmTile(page, 8, 6);
	await expect(greenhouseSlot).toHaveCount(0);

	// Walk near greenhouse base (placed at (544, 416))
	await movePlayerNear(page, 544, 440, 12);

	// Prompt appears when standing close
	const prompt = page.getByTestId("travel-prompt");
	await expect(prompt).toContainText("open greenhouse");

	// Press E to open greenhouse
	await page.keyboard.press("e");

	// Greenhouse window opens
	const window = page.getByTestId("greenhouse-window");
	await expect(window).toBeVisible();

	// Deposit 1 seed from the tray by clicking (starts with 10 tomato seeds)
	const seedChip = page
		.getByTestId("greenhouse-seed-tray")
		.getByRole("button")
		.first();
	await expect(seedChip).toBeVisible();
	await expect(seedChip).toContainText("(10)");
	await seedChip.click();

	// Count drops to (9) because clicking deposits exactly 1 seed
	await expect(seedChip).toContainText("(9)");

	// Wait for growth to complete (e2e grow_ms is 100ms) and output slot to become enabled
	const outputSlot = page.getByTestId("greenhouse-output-slot");
	await expect(outputSlot).toBeEnabled({ timeout: 5000 });

	// Collect output
	await outputSlot.click();
	await expect(outputSlot).toBeDisabled();

	// Drag the remaining seeds into the input slot to deposit all available (9 seeds)
	const inputSlot = page.getByTestId("greenhouse-input-slot");
	await seedChip.dragTo(inputSlot);

	// The tray is now empty because all remaining seeds were deposited at once
	await expect(
		page.getByText("No seeds in inventory. Buy seeds at the Market!"),
	).toBeVisible();

	// Wait for output to be ready and collect
	await expect(outputSlot).toBeEnabled({ timeout: 5000 });
	await outputSlot.click();

	// Close with Esc
	await page.keyboard.press("Escape");
	await expect(window).toBeHidden();

	// Verify clicking greenhouse also opens it
	await clickWorld(page, 544, 380);
	await expect(window).toBeVisible();
	await page.getByTestId("greenhouse-close").click();
	await expect(window).toBeHidden();
});
