import { expect, test } from "@playwright/test";
import {
	enterMarketplace,
	hubPeerList,
	register,
	resetServer,
	uniqueName,
	waitForHubPeer,
	waitForHubPeerGone,
	walkUntilPrompt,
} from "./helpers";

test("players in the marketplace see each other", async ({ browser }) => {
	await resetServer();
	const aliceName = uniqueName("Alice");
	const bobName = uniqueName("Bob");
	const aliceContext = await browser.newContext();
	const bobContext = await browser.newContext();
	const alice = await aliceContext.newPage();
	const bob = await bobContext.newPage();

	try {
		await register(alice, aliceName);
		await register(bob, bobName);

		// Farms stay private: no peers are listed there.
		expect(await hubPeerList(alice)).toBe("");
		expect(await hubPeerList(bob)).toBe("");

		await enterMarketplace(alice);
		await enterMarketplace(bob);

		await waitForHubPeer(alice, bobName);
		await waitForHubPeer(bob, aliceName);
		// The local player is never their own peer.
		expect(await hubPeerList(alice)).not.toContain(aliceName);
	} finally {
		await aliceContext.close();
		await bobContext.close();
	}
});

test("the casino shows players in the casino, not the marketplace", async ({
	browser,
}) => {
	await resetServer();
	const aliceName = uniqueName("Alice");
	const bobName = uniqueName("Bob");
	const aliceContext = await browser.newContext();
	const bobContext = await browser.newContext();
	const alice = await aliceContext.newPage();
	const bob = await bobContext.newPage();

	try {
		await register(alice, aliceName);
		await register(bob, bobName);
		await enterMarketplace(alice);
		await enterMarketplace(bob);
		await waitForHubPeer(alice, bobName);

		// Bob leaves for the casino; he disappears from the marketplace.
		await walkUntilPrompt(bob, ["w"], "enter the casino");
		await bob.keyboard.press("e");
		await expect(bob.locator("canvas")).toHaveAttribute(
			"aria-label",
			/^Casino map/,
		);

		await waitForHubPeerGone(alice, bobName);
		expect(await hubPeerList(bob)).toBe("");

		// Alice joins him and both are visible in the casino.
		await walkUntilPrompt(alice, ["w"], "enter the casino");
		await alice.keyboard.press("e");
		await expect(alice.locator("canvas")).toHaveAttribute(
			"aria-label",
			/^Casino map/,
		);

		await waitForHubPeer(alice, bobName);
		await waitForHubPeer(bob, aliceName);
	} finally {
		await aliceContext.close();
		await bobContext.close();
	}
});
