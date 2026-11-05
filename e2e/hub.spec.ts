import { expect, type Page } from "@playwright/test";
import {
	expectArea,
	hubPeerList,
	registerFast,
	multiplayerTest as test,
	uniqueName,
	useDoor,
	waitForHubPeer,
	waitForHubPeerGone,
	waitForWorld,
	walkUntilPrompt,
	worldUrl,
} from "./helpers";

/**
 * Hops straight into the marketplace hub. The train trip is covered once in
 * `journey.spec.ts`; multiplayer specs only care about presence.
 */
async function enterMarketplaceHub(page: Page): Promise<void> {
	await page.goto(worldUrl("marketplace"));
	await waitForWorld(page);
}

test("players in the marketplace see each other", async ({ twoPlayers }) => {
	const [alice, bob] = await twoPlayers();
	const aliceName = uniqueName("Alice");
	const bobName = uniqueName("Bob");

	await registerFast(alice, aliceName);
	await registerFast(bob, bobName);

	// Farms stay private: no peers are listed there.
	expect(await hubPeerList(alice)).toBe("");
	expect(await hubPeerList(bob)).toBe("");

	await enterMarketplaceHub(alice);
	await enterMarketplaceHub(bob);

	await waitForHubPeer(alice, bobName);
	await waitForHubPeer(bob, aliceName);
	// The local player is never their own peer.
	expect(await hubPeerList(alice)).not.toContain(aliceName);

	// Leaving the hub drops the peer from the other screen.
	await bob.goto(worldUrl());
	await waitForWorld(bob);
	await waitForHubPeerGone(alice, bobName);
});

test("the casino shows players in the casino, not the marketplace", async ({
	twoPlayers,
}) => {
	const [alice, bob] = await twoPlayers();
	const aliceName = uniqueName("Alice");
	const bobName = uniqueName("Bob");

	await registerFast(alice, aliceName);
	await registerFast(bob, bobName);
	await enterMarketplaceHub(alice);
	await enterMarketplaceHub(bob);
	await waitForHubPeer(alice, bobName);

	// Bob leaves for the casino; he disappears from the marketplace.
	await bob.bringToFront();
	await walkUntilPrompt(bob, ["w"], "enter the casino");
	await useDoor(bob);
	await expectArea(bob, /^Casino map/, 10_000);

	await waitForHubPeerGone(alice, bobName);
	expect(await hubPeerList(bob)).toBe("");

	// Alice joins him and both are visible in the casino.
	await alice.bringToFront();
	await walkUntilPrompt(alice, ["w"], "enter the casino");
	await useDoor(alice);
	await expectArea(alice, /^Casino map/, 10_000);

	await waitForHubPeer(alice, bobName);
	await waitForHubPeer(bob, aliceName);
});
