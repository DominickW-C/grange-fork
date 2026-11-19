import type { Channel } from "phoenix";
import type { ChatLine } from "../../shared/types";
import { useNotificationStore } from "../notifications/notificationStore";
import { reasonOf, socket } from "../socket";

/** Mirrors `Grange.Chat.max_length/0`; the input also enforces it. */
export const CHAT_MAX_LENGTH = 200;

const TOWN_TOPIC = "chat:town";

let town: Channel | null = null;
let townRef: number | null = null;
let townJoining = false;
let farm: Channel | null = null;
let farmRef: number | null = null;
let farmOwner: string | null = null;
/**
 * The room this client is currently *in*: `"town"`, `farm:<owner>`, or null
 * while travelling. Chat only ever goes to this room.
 */
let room: string | null = null;

function handleChat(payload: unknown): void {
	const line = payload as Partial<ChatLine> | null;
	if (
		!line ||
		typeof line.author !== "string" ||
		typeof line.text !== "string"
	) {
		return;
	}
	useNotificationStore.getState().pushChat(line.author, line.text);
}

/**
 * Switches rooms and drops the previous room's player lines so marketplace
 * chatter never lingers over farm chat.
 */
function setRoom(next: string | null): void {
	if (room === next) return;
	room = next;
	useNotificationStore.getState().clearPlayerMessages();
}

/** Binds the joined farm channel as the chat sender. Safe to call repeatedly. */
export function bindFarmChat(channel: Channel, owner: string): void {
	if (farm === channel && farmOwner === owner) {
		setRoom(`farm:${owner}`);
		return;
	}
	unbindFarmChat();
	farm = channel;
	farmOwner = owner;
	farmRef = channel.on("chat", handleChat);
	setRoom(`farm:${owner}`);
}

/** Stops listening to a farm room, e.g. when travelling into town. */
export function unbindFarmChat(): void {
	const channel = farm;
	const ref = farmRef;
	const owner = farmOwner;
	farm = null;
	farmRef = null;
	farmOwner = null;
	if (channel && ref !== null) channel.off("chat", ref);
	if (owner !== null && room === `farm:${owner}`) setRoom(null);
}

/** Joins the shared town room (marketplace, casino, bank, livestock market). */
export function enterTownChat(): void {
	if (town) {
		if (town.state === "joined") setRoom("town");
		return;
	}
	if (townJoining) return;

	townJoining = true;
	const channel = socket.channel(TOWN_TOPIC, {});
	town = channel;
	townRef = channel.on("chat", handleChat);

	channel
		.join()
		.receive("ok", () => {
			if (town !== channel) return;
			townJoining = false;
			setRoom("town");
		})
		.receive("error", () => {
			if (town !== channel) return;
			townJoining = false;
			detachTown(channel);
		})
		.receive("timeout", () => {
			if (town !== channel) return;
			townJoining = false;
			detachTown(channel);
		});
}

/** Leaves the town room; the next farm visit binds its own channel. */
export function leaveTownChat(): void {
	townJoining = false;
	const channel = town;
	town = null;
	if (channel) {
		detachTown(channel);
		channel.leave();
	}
	if (room === "town") setRoom(null);
}

function detachTown(channel: Channel): void {
	const ref = townRef;
	townRef = null;
	town = null;
	if (ref !== null) channel.off("chat", ref);
}

function activeChannel(): Channel | null {
	if (room === "town") return town;
	if (room?.startsWith("farm:")) return farm;
	return null;
}

/**
 * Sends a line to the current room. Returns false when there is nothing to
 * send or no room is joined, so the composer can keep its draft.
 */
export function sendChat(raw: string): boolean {
	const text = raw.trim();
	if (!text) return false;
	if (text.length > CHAT_MAX_LENGTH) {
		useNotificationStore.getState().push("message is too long", "error");
		return false;
	}

	const channel = activeChannel();
	// The room may still be joining (or the socket reconnecting after sign-in);
	// keeping the draft is better than throwing out of the form handler.
	if (channel?.state !== "joined") return false;

	try {
		channel
			.push("chat", { text })
			.receive("error", (payload: unknown) => {
				useNotificationStore
					.getState()
					.push(reasonOf(payload) ?? "message not sent", "error");
			})
			.receive("timeout", () => {
				useNotificationStore.getState().push("message not sent", "error");
			});
	} catch {
		return false;
	}
	return true;
}
