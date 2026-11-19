import { expect, type Page } from "@playwright/test";

const FEED = '[data-testid="notification-feed"]';

/** One feed line, matched by its `[author]` prefix and its text. */
function chatLine(page: Page, author: string, text: string) {
	return page
		.locator(`${FEED} li`)
		.filter({ hasText: `[${author}]` })
		.filter({ hasText: text });
}

/** Any feed line containing `text`, regardless of author. */
function anyLine(page: Page, text: string) {
	return page.locator(`${FEED} li`).filter({ hasText: text });
}

/** Opens the chat composer the way the game does: press Enter. */
export async function openChat(page: Page): Promise<void> {
	await page.keyboard.press("Enter");
	await expect(page.getByTestId("chat-input")).toBeVisible();
}

/** Opens the composer, types a line, and sends it with Enter. */
export async function sendChat(page: Page, text: string): Promise<void> {
	await openChat(page);
	const input = page.getByTestId("chat-input");
	await input.fill(text);
	await input.press("Enter");
	await expect(page.getByTestId("chat-input")).toHaveCount(0);
}

/** Waits for `[author] text` to land in the feed. */
export async function expectChatLine(
	page: Page,
	author: string,
	text: string,
	timeout = 10_000,
): Promise<void> {
	await expect(chatLine(page, author, text)).toBeVisible({ timeout });
}

/**
 * Asserts `text` never reached this page's feed.
 *
 * Waits first so a line that is merely late still fails the check; callers
 * normally confirm the sender's own copy landed before calling this.
 */
export async function expectNoChatLine(
	page: Page,
	text: string,
	settleMs = 1_000,
): Promise<void> {
	await page.waitForTimeout(settleMs);
	await expect(anyLine(page, text)).toHaveCount(0);
}

/** Asserts a chat line is gone, e.g. after leaving the room it was said in. */
export async function expectChatCleared(
	page: Page,
	text: string,
	timeout = 10_000,
): Promise<void> {
	await expect(anyLine(page, text)).toHaveCount(0, { timeout });
}

/** Asserts the feed prefixes a game notice with `[GRANGE]`. */
export async function expectGameNotice(
	page: Page,
	text: string,
): Promise<void> {
	await expect(chatLine(page, "GRANGE", text)).toBeVisible();
}
