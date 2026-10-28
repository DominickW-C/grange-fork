import { type Channel, Presence } from "phoenix";
import type { HubArea, HubPeer } from "../../shared/types";
import { socket } from "../socket";
import { useGameStore } from "../store";

/** Positions are cosmetic; this keeps hub chatter light. */
const SEND_INTERVAL_MS = 100;
const MIN_SEND_DISTANCE = 1.5;

interface PresenceMeta {
	x?: unknown;
	y?: unknown;
	at?: unknown;
}

interface PresenceEntry {
	metas?: PresenceMeta[];
}

let channel: Channel | null = null;
let area: HubArea | null = null;
let joined = false;
let lastSentAt = 0;
let lastSent: HubPeer | null = null;
let latest: { x: number; y: number } | null = null;
let peers: HubPeer[] = [];
let peerNames = "";
const listeners = new Set<(names: string[]) => void>();

/** Latest snapshot of everyone else in the current hub area. */
export function getHubPeers(): HubPeer[] {
	return peers;
}

/**
 * Notifies when the *set* of names changes, not on every position update, so
 * React does not re-render at movement frequency.
 */
export function subscribeHubPeers(
	listener: (names: string[]) => void,
): () => void {
	listeners.add(listener);
	listener(splitNames());
	return () => {
		listeners.delete(listener);
	};
}

/** Joins one hub area, leaving the previous one. Safe to call repeatedly. */
export function joinHub(next: HubArea): void {
	if (area === next && channel) return;
	leaveHub();

	area = next;
	joined = false;
	lastSent = null;
	lastSentAt = 0;

	const joinedChannel = socket.channel(`hub:${next}`, {});
	channel = joinedChannel;

	const hubPresence = new Presence(joinedChannel);
	hubPresence.onSync(() => {
		if (channel !== joinedChannel) return;
		peers = readPeers(hubPresence);
		notify();
	});

	joinedChannel
		.join()
		.receive("ok", () => {
			if (channel !== joinedChannel) return;
			joined = true;
			if (latest) send(latest.x, latest.y, true);
		})
		.receive("error", () => {
			if (channel !== joinedChannel) return;
			leaveHub();
		});
}

/** Leaves the current hub area and forgets its players. */
export function leaveHub(): void {
	const leaving = channel;
	channel = null;
	area = null;
	joined = false;
	lastSent = null;
	latest = null;
	leaving?.leave();
	if (peers.length > 0) {
		peers = [];
		notify();
	}
}

/** Reports the local avatar position; throttled and dead-banded. */
export function publishHubPosition(x: number, y: number): void {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return;
	latest = { x, y };
	if (!joined || !channel) return;
	if (
		lastSent &&
		Math.hypot(x - lastSent.x, y - lastSent.y) < MIN_SEND_DISTANCE
	) {
		return;
	}
	send(x, y);
}

function send(x: number, y: number, force = false): void {
	if (!channel) return;
	const now = Date.now();
	if (!force && now - lastSentAt < SEND_INTERVAL_MS) return;
	lastSentAt = now;
	lastSent = { name: "", x, y };
	channel.push("move", { x, y });
}

function readPeers(hubPresence: Presence): HubPeer[] {
	const self = useGameStore.getState().username;
	return hubPresence
		.list((name: string, entry: PresenceEntry): HubPeer | null => {
			const meta = newestMeta(entry?.metas ?? []);
			if (!meta) return null;
			const x = typeof meta.x === "number" ? meta.x : null;
			const y = typeof meta.y === "number" ? meta.y : null;
			// Players are tracked before their first position report.
			if (x === null || y === null) return null;
			return { name, x, y };
		})
		.filter((peer): peer is HubPeer => peer !== null && peer.name !== self);
}

/**
 * A second tab of the same account groups under the same presence key. The
 * newest report wins, so the hub still shows one avatar per account.
 */
function newestMeta(metas: PresenceMeta[]): PresenceMeta | null {
	let newest: PresenceMeta | null = null;
	let newestAt = Number.NEGATIVE_INFINITY;
	for (const meta of metas) {
		const at = typeof meta.at === "number" ? meta.at : 0;
		if (at >= newestAt) {
			newestAt = at;
			newest = meta;
		}
	}
	return newest;
}

function notify(): void {
	const names = peers
		.map((peer) => peer.name)
		.sort()
		.join(",");
	if (names === peerNames) return;
	peerNames = names;
	const value = splitNames();
	for (const listener of listeners) listener(value);
}

function splitNames(): string[] {
	return peerNames ? peerNames.split(",") : [];
}
