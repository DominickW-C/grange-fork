import { expect, test } from "@playwright/test";
import {
	holdKeys,
	registerFast,
	uniqueName,
	walkToCasino,
	walkUntilPrompt,
} from "./helpers";

/**
 * One trip to the casino covers all four tables. Each table used to re-walk
 * farm -> marketplace -> casino in its own spec file, which cost more than the
 * game it was testing.
 */
test("the casino tables open playable sub-screens", async ({ page }) => {
	test.setTimeout(180_000);
	await registerFast(page, uniqueName("Highroller"));
	const canvas = page.locator("canvas");

	await walkToCasino(page);

	// Blackjack sits straight down from the casino spawn.
	await walkUntilPrompt(page, ["s"], "play blackjack");
	await page.keyboard.press("e");
	const blackjack = page.getByTestId("blackjack-overlay");
	await expect(blackjack).toBeVisible();
	await expect(page.getByTestId("blackjack-balance")).toContainText("100");
	await expect(page.getByTestId("blackjack-deal")).toBeVisible();
	// Bet, deal, and confirm the player is dealt a hand.
	await page.getByTestId("blackjack-chip-25").click();
	await page.getByTestId("blackjack-deal").click();
	await expect(page.getByTestId("blackjack-player-hand")).toBeVisible();
	await page.getByTestId("blackjack-close").click();
	await expect(blackjack).toHaveCount(0);
	await expect(canvas).toHaveAttribute("aria-label", /^Casino map/);

	// Poker is west along the same row of tables.
	await walkUntilPrompt(page, ["a"], "play poker", 20_000);
	await page.keyboard.press("e");
	const poker = page.getByTestId("poker-overlay");
	await expect(poker).toBeVisible();
	await expect(page.getByTestId("poker-deal")).toBeVisible();
	// Dealing posts the blinds and gives the player two hole cards.
	await page.getByTestId("poker-deal").click();
	await expect(page.getByTestId("poker-pot")).toContainText("15");
	await expect(
		page.getByTestId("poker-player-hand").locator('[role="img"]'),
	).toHaveCount(2);
	await page.getByTestId("poker-close").click();
	await expect(poker).toHaveCount(0);

	// Roulette is east, past the blackjack table.
	await walkUntilPrompt(page, ["d"], "play roulette", 20_000);
	await page.keyboard.press("e");
	const roulette = page.getByTestId("roulette-overlay");
	await expect(roulette).toBeVisible();
	await expect(page.getByTestId("roulette-spin")).toBeDisabled();
	// Place 5 on red and see the chip land on the felt. The wallet is shared
	// across the tables, so the small chip keeps the slots below affordable.
	await page.getByTestId("roulette-spot-outside:red").click();
	await expect(page.getByTestId("roulette-bet-dialog")).toBeVisible();
	await page.getByTestId("roulette-dialog-chip-5").click();
	await page.getByTestId("roulette-confirm").click();
	await expect(page.getByTestId("roulette-chip-outside:red")).toContainText(
		"5",
	);
	await expect(page.getByTestId("roulette-staked")).toContainText("5");
	// Spin and wait for the wheel to settle into a result.
	await page.getByTestId("roulette-spin").click();
	await expect(page.getByTestId("roulette-message")).toContainText("Spinning");
	await expect(page.getByTestId("roulette-play-again")).toBeVisible({
		timeout: 8_000,
	});
	await expect(page.getByTestId("roulette-result")).not.toHaveText("—");
	await page.getByTestId("roulette-close").click();
	await expect(roulette).toHaveCount(0);

	// Slots run along the bottom wall. Anchor on the blackjack table so the
	// next step starts from a known column, step west into the aisle between
	// the poker and blackjack tables, then drop straight south into range.
	await walkUntilPrompt(page, ["a"], "play blackjack", 20_000);
	await holdKeys(page, ["a"], 1_500);
	await walkUntilPrompt(page, ["s"], "play the slots", 20_000);
	await page.keyboard.press("e");
	const slots = page.getByTestId("slots-overlay");
	await expect(slots).toBeVisible();
	// Pick the $50 spin and watch the reels settle into a result.
	await page.getByTestId("slots-bet-50").click();
	await expect(page.getByTestId("slots-current-bet")).toContainText("50");
	await page.getByTestId("slots-spin").click();
	await expect(page.getByTestId("slots-message")).toContainText("Spinning");
	await expect(page.getByTestId("slots-play-again")).toBeVisible({
		timeout: 8_000,
	});
	await expect(page.getByTestId("slots-reel-0")).toHaveAttribute(
		"data-symbol",
		/.+/,
	);
	// Auto-spin: drop to the $1 bet and let it run several rounds unattended.
	await page.getByTestId("slots-play-again").click();
	await page.getByTestId("slots-bet-1").click();
	await page.getByTestId("slots-auto").click();
	await expect(page.getByTestId("slots-auto")).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await page.waitForFunction(
		() => {
			const el = document.querySelector('[data-testid="slots-spin-count"]');
			return el !== null && Number(el.getAttribute("data-spins")) >= 3;
		},
		undefined,
		{ timeout: 20_000 },
	);
	await page.getByTestId("slots-auto").click();
	await expect(page.getByTestId("slots-auto")).toHaveAttribute(
		"aria-pressed",
		"false",
	);
	await expect(page.getByTestId("slots-close")).toBeEnabled({
		timeout: 10_000,
	});
	await page.getByTestId("slots-close").click();
	await expect(slots).toHaveCount(0);
	await expect(canvas).toHaveAttribute("aria-label", /^Casino map/);

	// The doorway out of the casino returns to the marketplace.
	await holdKeys(page, ["w"], 3_000);
	await walkUntilPrompt(page, ["d"], "leave the casino", 20_000);
	await page.keyboard.press("e");
	await expect(canvas).toHaveAttribute("aria-label", /^Marketplace map/, {
		timeout: 30_000,
	});
});
