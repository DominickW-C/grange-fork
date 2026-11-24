import { useEffect, useState } from "react";
import { SEED_TO_CROP } from "../../shared/greenhouse";
import type { GreenhouseState } from "../../shared/types";
import type { InventorySlot } from "../inventory/inventoryStore";
import { useInventoryStore } from "../inventory/inventoryStore";
import type { ItemId } from "../inventory/items";
import { useGameStore } from "../store";
import { emitGreenhouseAction } from "./greenhouseSocket";

const EMPTY_GREENHOUSE: GreenhouseState = {
	input_item: null,
	input_count: 0,
	output_item: null,
	output_count: 0,
	growing_crop: null,
	ready_at: null,
	grow_ms: null,
};

export function tallyAvailableSeeds(
	hotbar: InventorySlot[],
	grid: InventorySlot[],
): Array<{ itemId: ItemId; count: number }> {
	const availableSeeds: Array<{ itemId: ItemId; count: number }> = [];
	const seen = new Map<ItemId, number>();
	for (const slot of [...hotbar, ...grid]) {
		if (slot.itemId && slot.itemId in SEED_TO_CROP && slot.count > 0) {
			seen.set(slot.itemId, (seen.get(slot.itemId) ?? 0) + slot.count);
		}
	}
	for (const [itemId, count] of seen.entries()) {
		availableSeeds.push({ itemId, count });
	}
	return availableSeeds;
}

export function useGreenhouse(owner: string) {
	const greenhouse = useGameStore(
		(s) => s.activeFarm?.greenhouse ?? EMPTY_GREENHOUSE,
	);
	const [progress, setProgress] = useState(0);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const grid = useInventoryStore((s) => s.grid);
	const hotbar = useInventoryStore((s) => s.hotbar);

	const availableSeeds = tallyAvailableSeeds(hotbar, grid);

	useEffect(() => {
		if (
			!greenhouse.growing_crop ||
			!greenhouse.ready_at ||
			!greenhouse.grow_ms
		) {
			setProgress(0);
			return;
		}

		const readyAt = greenhouse.ready_at;
		const growMs = greenhouse.grow_ms;

		const interval = setInterval(() => {
			const now = Date.now();
			const elapsed = Math.max(0, growMs - (readyAt - now));
			const ratio = Math.min(1, Math.max(0, elapsed / growMs));
			setProgress(ratio);
		}, 60);

		return () => clearInterval(interval);
	}, [greenhouse.growing_crop, greenhouse.ready_at, greenhouse.grow_ms]);

	function insertSeed(item: string, count = 1) {
		if (busy) return;
		setBusy(true);
		setMessage(null);
		emitGreenhouseAction(owner, { kind: "insert_seed", item, count }, (res) => {
			setBusy(false);
			if (res.seeds) useInventoryStore.getState().hydrateSeeds(res.seeds);
			if (!res.ok) setMessage(res.error ?? "Could not insert seed.");
		});
	}

	function takeOutput() {
		if (busy || greenhouse.output_count <= 0) return;
		setBusy(true);
		setMessage(null);
		emitGreenhouseAction(owner, { kind: "take_output" }, (res) => {
			setBusy(false);
			if (!res.ok) setMessage(res.error ?? "Could not collect produce.");
		});
	}

	function takeInput() {
		if (busy || greenhouse.input_count <= 0) return;
		setBusy(true);
		setMessage(null);
		emitGreenhouseAction(owner, { kind: "take_input" }, (res) => {
			setBusy(false);
			if (res.seeds) useInventoryStore.getState().hydrateSeeds(res.seeds);
			if (!res.ok) setMessage(res.error ?? "Could not retrieve seeds.");
		});
	}

	return {
		greenhouse,
		progress,
		busy,
		message,
		availableSeeds,
		insertSeed,
		takeOutput,
		takeInput,
	};
}
