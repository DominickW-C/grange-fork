import { expect } from "@playwright/test";
import {
	expectArea,
	expectChatCleared,
	expectChatLine,
	expectGameNotice,
	expectNoChatLine,
	multiplayerTest as test,
	openChat,
	playerPosition,
	registerFast,
	rideTrain,
	sendChat,
	TRAVEL_TIMEOUT,
	uniqueName,
	waitForFarmPeer,
	waitForWorld,
	walkUntilPrompt,
} from "./helpers";

test("town chat is shared across non-farm areas", async ({ twoPlayers }) => {
	const [alice, bob] = await twoPlayers();
	const aliceName = uniqueName("Town-Alice");
	const bobName = uniqueName("Town-Bob");

	// Two different town rooms: the marketplace and the bank interior.
	await registerFast(alice, aliceName, { area: "marketplace" });
	await registerFast(bob, bobName, { area: "bank" });
	await expectArea(alice, /^Marketplace map/);
	await expectArea(bob, /^Bank map/, 10_000);

	// Bob speaks first, which also proves his socket joined the town room.
	await sendChat(bob, "hello from the bank");
	await expectChatLine(bob, bobName, "hello from the bank");
	await expectChatLine(alice, bobName, "hello from the bank");

	await sendChat(alice, "hello from the market");
	await expectChatLine(alice, aliceName, "hello from the market");
	await expectChatLine(bob, aliceName, "hello from the market");
});

test("farm chat stays on the farm and follows the player out", async ({
	twoPlayers,
}) => {
	// Two contexts, a house menu, and two train rides on a busy runner.
	test.setTimeout(240_000);

	const [owner, guest] = await twoPlayers();
	const ownerName = uniqueName("Farm-Owner");
	const guestName = uniqueName("Farm-Guest");

	await registerFast(owner, ownerName);

	// Open the farm so the guest can visit it.
	await walkUntilPrompt(owner, ["a", "w"], "enter the farmhouse", 20_000);
	await owner.keyboard.press("e");
	await expect(owner.getByTestId("house-menu")).toBeVisible();
	await owner.getByTestId("house-visibility-toggle").click();
	await expect(owner.getByTestId("house-visibility-toggle")).toContainText(
		"Public",
	);
	await owner.getByTestId("house-close").click();

	await registerFast(guest, guestName);
	await walkUntilPrompt(guest, ["d"], "board the train", TRAVEL_TIMEOUT);
	await rideTrain(guest, `farm-${ownerName}`);
	await expect(guest).toHaveURL(new RegExp(`/farms/${ownerName}$`), {
		timeout: TRAVEL_TIMEOUT,
	});
	await waitForWorld(guest);
	await waitForFarmPeer(guest, ownerName);
	await waitForFarmPeer(owner, guestName);

	// Farm lines reach everyone standing on this farm.
	await sendChat(guest, "hi from the yard");
	await expectChatLine(guest, guestName, "hi from the yard");
	await expectChatLine(owner, guestName, "hi from the yard");

	await sendChat(owner, "welcome to the farm");
	await expectChatLine(owner, ownerName, "welcome to the farm");
	await expectChatLine(guest, ownerName, "welcome to the farm");

	// The guest rides into town; the farm room is left behind.
	await guest.bringToFront();
	await walkUntilPrompt(guest, ["d"], "board the train", TRAVEL_TIMEOUT);
	await rideTrain(guest, "marketplace");
	await expectArea(guest, /^Marketplace map/, TRAVEL_TIMEOUT);
	await expectChatCleared(guest, "hi from the yard");

	// Neither side hears the other once they are in different rooms.
	await sendChat(owner, "still on the farm");
	await expectChatLine(owner, ownerName, "still on the farm");
	await expectNoChatLine(guest, "still on the farm");

	await sendChat(guest, "now in town");
	await expectChatLine(guest, guestName, "now in town");
	await expectNoChatLine(owner, "now in town");
});

test("Enter opens chat, typing freezes the farmer, and E still interacts", async ({
	page,
}) => {
	await registerFast(page, uniqueName("Typist"));

	// Game notices keep their own prefix in the shared feed.
	await expectGameNotice(page, "Welcome to your farm.");

	await walkUntilPrompt(page, ["a", "w"], "enter the farmhouse", 20_000);
	const before = await playerPosition(page);
	expect(before).not.toBeNull();

	// Enter is chat now, not an interact alias.
	await openChat(page);
	await expect(page.getByTestId("house-menu")).toHaveCount(0);

	// Typing W/A/S/D and Space must stay in the input.
	const input = page.getByTestId("chat-input");
	await input.type("wasd e space");
	await expect(input).toHaveValue("wasd e space");
	await expect(page.getByTestId("house-menu")).toHaveCount(0);
	await page.waitForTimeout(500);
	expect(await playerPosition(page)).toEqual(before);

	// Escape cancels without sending anything.
	await input.press("Escape");
	await expect(page.getByTestId("chat-input")).toHaveCount(0);
	await expect(page.getByTestId("notification-feed")).not.toContainText(
		"wasd e space",
	);

	// E still opens the farmhouse menu.
	await page.keyboard.press("e");
	await expect(page.getByTestId("house-menu")).toBeVisible();
});
