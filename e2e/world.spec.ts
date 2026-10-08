import { expect, test } from "@playwright/test";
import { BASE, register, resetServer, uniqueName } from "./helpers";

test("farm world loads without asset or page errors", async ({ page }) => {
	const pageErrors: string[] = [];
	const failedAssets: string[] = [];

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	page.on("response", (response) => {
		if (
			/\/assets\/(farm|marketplace|transport)\//.test(response.url()) &&
			!response.ok()
		) {
			failedAssets.push(response.url());
		}
	});

	await resetServer();
	await register(page, uniqueName("Sprout"));

	const canvas = page.locator("canvas[aria-label^='Farm map']");
	await expect(canvas).toBeVisible();

	await page.waitForLoadState("networkidle");

	expect(pageErrors).toEqual([]);
	expect(failedAssets).toEqual([]);
});

test("the train travels between the farm and marketplace", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("Traveler"));

	const canvas = page.locator("canvas");
	await expect(canvas).toHaveAttribute("aria-label", /^Farm map/);
	await page.waitForLoadState("networkidle");

	await page.keyboard.down("d");
	await page.waitForTimeout(1_000);
	await page.keyboard.up("d");

	const prompt = page.getByTestId("travel-prompt");
	await expect(prompt).toContainText("travel to the marketplace");
	await page.keyboard.press("e");

	await expect(canvas).toHaveAttribute("aria-label", /^Marketplace map/);
	await expect(prompt).toContainText("return to the farm");
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Farm map/);
});

test("the marketplace casino opens and returns outside", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("Highroller"));

	const canvas = page.locator("canvas");
	const prompt = page.getByTestId("travel-prompt");
	await page.waitForLoadState("networkidle");
	await page.keyboard.down("d");
	await page.waitForTimeout(1_000);
	await page.keyboard.up("d");
	await expect(prompt).toContainText("travel to the marketplace");
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Marketplace map/);

	await page.keyboard.down("w");
	await page.keyboard.down("d");
	await page.waitForTimeout(2_900);
	await page.keyboard.up("w");
	await page.keyboard.up("d");
	await page.keyboard.down("d");
	await page.waitForTimeout(1_200);
	await page.keyboard.up("d");

	await expect(prompt).toContainText("enter the casino");
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Casino map/);
	await expect(prompt).toContainText("leave the casino");

	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Marketplace map/);
});

test("the farm map is closed to visitors without a session", async ({ page }) => {
	await resetServer();
	await page.goto("/world");

	await expect(page).toHaveURL("/");
	await expect(
		page.locator("canvas[aria-label^='Farm map']"),
	).toHaveCount(0);
});

test("farm world shows the starting balance HUD", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("Sprout"));

	const balance = page.getByTestId("farm-balance");
	await expect(balance).toBeVisible();
	await expect(balance).toContainText("100");
});

test("balance belongs to the account and starts fresh for a new one", async ({
	page,
}) => {
	await resetServer();
	await register(page, uniqueName("Saver"));
	await expect(page.getByTestId("farm-balance")).toContainText("100");

	// Spend through the server, the same call the client makes on a purchase.
	const spent = await page.request.post(`${BASE}/api/economy/transaction`, {
		data: { delta: -40 },
	});
	expect(spent.ok()).toBeTruthy();

	// A reload re-reads the stored balance from the account.
	await page.reload();
	await expect(page.getByTestId("farm-balance")).toContainText("60");

	// A different account must not inherit the first one's balance.
	await page.getByTestId("logout").click();
	await page.waitForURL(`${BASE}/`);
	await register(page, uniqueName("Fresh"));
	await expect(page.getByTestId("farm-balance")).toContainText("100");
});

test("the blackjack table opens a playable sub-screen", async ({ page }) => {
	await resetServer();
	await register(page, uniqueName("Cardcounter"));

	const canvas = page.locator("canvas");
	const prompt = page.getByTestId("travel-prompt");
	await page.waitForLoadState("networkidle");

	// Farm -> marketplace.
	await page.keyboard.down("d");
	await page.waitForTimeout(1_000);
	await page.keyboard.up("d");
	await expect(prompt).toContainText("travel to the marketplace");
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Marketplace map/);

	// Marketplace -> casino.
	await page.keyboard.down("w");
	await page.keyboard.down("d");
	await page.waitForTimeout(2_900);
	await page.keyboard.up("w");
	await page.keyboard.up("d");
	await page.keyboard.down("d");
	await page.waitForTimeout(1_200);
	await page.keyboard.up("d");
	await expect(prompt).toContainText("enter the casino");
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Casino map/);

	// Walk down to the blackjack table and open the sub-screen.
	await page.keyboard.down("s");
	await page.waitForTimeout(800);
	await page.keyboard.up("s");
	await expect(prompt).toContainText("play blackjack");
	await page.keyboard.press("e");

	const overlay = page.getByTestId("blackjack-overlay");
	await expect(overlay).toBeVisible();
	await expect(page.getByTestId("blackjack-balance")).toContainText("100");
	await expect(page.getByTestId("blackjack-deal")).toBeVisible();

	// Bet, deal, and confirm the player is dealt a hand.
	await page.getByTestId("blackjack-chip-25").click();
	await page.getByTestId("blackjack-deal").click();
	await expect(page.getByTestId("blackjack-player-hand")).toBeVisible();

	// Closing the overlay hands control back to the paused world.
	await page.getByTestId("blackjack-close").click();
	await expect(overlay).toHaveCount(0);
	await expect(canvas).toHaveAttribute("aria-label", /^Casino map/);
});
