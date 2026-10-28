import * as ex from "excalibur";
import type { HubPeer } from "../../shared/types";
import { addFarmerGraphics, updateFarmerGraphics } from "./farmerSprite";
import { remoteDirection, remoteStep, shouldSnap } from "./hubInterpolation";

/** Space between the avatar's feet and the bottom of its name label. */
const LABEL_OFFSET_Y = 70;

/** Same layer as the local farmer, so all farmers draw together. */
const AVATAR_Z = 200;
const LABEL_Z = AVATAR_Z + 1;

interface RemoteAvatar {
	actor: ex.Actor;
	label: ex.Actor;
	target: { x: number; y: number };
}

/**
 * Renders the other players in a hub area and the local player's own name.
 *
 * Remote avatars are owned by this helper: presence snapshots add/remove them,
 * and each frame eases them toward their last reported position so movement
 * looks smooth despite the ~10 Hz update rate.
 */
export class HubPlayers {
	private readonly remotes = new Map<string, RemoteAvatar>();
	private readonly selfLabel: ex.Actor;

	constructor(
		private readonly scene: ex.Scene,
		private readonly local: ex.Actor,
		localName: string,
	) {
		this.selfLabel = createLabel(localName);
		scene.add(this.selfLabel);
		this.placeLabel(this.selfLabel, local.pos);
	}

	/** Matches the rendered avatars to the latest presence snapshot. */
	sync(peers: HubPeer[]): void {
		const seen = new Set<string>();

		for (const peer of peers) {
			seen.add(peer.name);
			const existing = this.remotes.get(peer.name);
			if (existing) {
				existing.target = { x: peer.x, y: peer.y };
				continue;
			}
			this.remotes.set(peer.name, this.createRemote(peer));
		}

		for (const [name, remote] of this.remotes) {
			if (seen.has(name)) continue;
			remote.actor.kill();
			remote.label.kill();
			this.remotes.delete(name);
		}
	}

	/** Eases remotes toward their targets. Call once per frame. */
	update(deltaMs: number): void {
		this.placeLabel(this.selfLabel, this.local.pos);
		this.selfLabel.graphics.visible = this.local.graphics.visible;

		for (const remote of this.remotes.values()) {
			const actor = remote.actor;
			const before = { x: actor.pos.x, y: actor.pos.y };
			const next = shouldSnap(before, remote.target)
				? remote.target
				: remoteStep(before, remote.target, deltaMs);

			actor.pos.x = next.x;
			actor.pos.y = next.y;
			updateFarmerGraphics(actor, remoteDirection(before, next));
			this.placeLabel(remote.label, actor.pos);
		}
	}

	/** Removes every remote avatar; used when leaving the hub area. */
	clear(): void {
		for (const remote of this.remotes.values()) {
			remote.actor.kill();
			remote.label.kill();
		}
		this.remotes.clear();
	}

	private createRemote(peer: HubPeer): RemoteAvatar {
		const actor = new ex.Actor({
			pos: ex.vec(peer.x, peer.y),
			width: 32,
			height: 32,
			anchor: ex.vec(0.5, 1),
			z: AVATAR_Z,
		});
		addFarmerGraphics(actor);
		this.scene.add(actor);

		const label = createLabel(peer.name);
		this.scene.add(label);
		this.placeLabel(label, actor.pos);

		return { actor, label, target: { x: peer.x, y: peer.y } };
	}

	private placeLabel(label: ex.Actor, pos: ex.Vector): void {
		label.pos.x = pos.x;
		label.pos.y = pos.y - LABEL_OFFSET_Y;
		label.z = LABEL_Z;
	}
}

function createLabel(text: string): ex.Actor {
	const font = new ex.Font({
		size: 16,
		family: '"Rye", serif',
		textAlign: ex.TextAlign.Center,
		shadow: {
			blur: 2,
			offset: ex.vec(1, 2),
			color: ex.Color.fromHex("#241208"),
		},
	});
	const label = new ex.Actor({
		pos: ex.vec(0, 0),
		anchor: ex.vec(0.5, 1),
		z: 0,
	});
	label.graphics.use(
		new ex.Text({ text, font, color: ex.Color.fromHex("#fff4d6") }),
	);
	return label;
}
