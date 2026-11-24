import type { ItemId } from "../inventory/items";
import type { FarmPropLayer } from "./farmPropLayer";
import { opensGreenhouse } from "./greenhouseActions";
import { useGreenhouseStore } from "./greenhouseStore";
import type { InputManager } from "./InputManager";

const PROMPT = "Press E to open greenhouse";

export class FarmGreenhouse {
	constructor(private readonly isOwner: boolean) {}

	prompt(
		player: { pos: { x: number; y: number } },
		props: FarmPropLayer,
	): string | null {
		const near =
			this.isOwner && props.greenhouseNear(player.pos.x, player.pos.y);
		return near ? PROMPT : null;
	}

	update(
		player: { pos: { x: number; y: number } },
		input: InputManager,
		props: FarmPropLayer,
	): void {
		const near =
			this.isOwner && props.greenhouseNear(player.pos.x, player.pos.y);
		if (!near || !input.consumePress("KeyE")) return;
		this.open();
	}

	handleClick(
		worldPos: { x: number; y: number },
		item: ItemId | null,
		props: FarmPropLayer,
	): boolean {
		const target = props.pick(worldPos.x, worldPos.y);
		if (!opensGreenhouse(this.isOwner, item, target?.asset)) return false;
		this.open();
		return true;
	}

	private open(): void {
		useGreenhouseStore.getState().setGreenhouseOpen(true);
	}
}
