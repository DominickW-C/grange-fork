import { beforeEach, describe, expect, it, vi } from "vitest";
import { cropToSeed } from "../../shared/greenhouse";
import { useInventoryStore } from "../inventory/inventoryStore";
import { getItemDef } from "../inventory/items";
import * as socketModule from "../socket";
import { emitGreenhouseAction } from "./greenhouseSocket";
import { tallyAvailableSeeds } from "./useGreenhouse";

describe("greenhouse seeds & helpers", () => {
	beforeEach(() => {
		useInventoryStore.getState().resetInventory();
	});

	it("tallies available seeds from hotbar and grid", () => {
		useInventoryStore
			.getState()
			.hydrateSeeds({ "seed-bag": 8, "wheat-seed": 3 });
		const state = useInventoryStore.getState();
		const availableSeeds = tallyAvailableSeeds(state.hotbar, state.grid);

		const tomato = availableSeeds.find((s) => s.itemId === "seed-bag");
		const wheat = availableSeeds.find((s) => s.itemId === "wheat-seed");
		expect(tomato?.count).toBe(8);
		expect(wheat?.count).toBe(3);
	});

	it("safely maps growing crops to valid item definitions without undefined errors", () => {
		const crops = [
			"tomato",
			"wheat",
			"lettuce",
			"midas_wheat",
			"frost_lettuce",
			"sunburst_tomato",
		];
		for (const crop of crops) {
			const seedItem = cropToSeed(crop);
			expect(seedItem).toBeTruthy();
			const def = getItemDef(seedItem as Parameters<typeof getItemDef>[0]);
			expect(def).toBeDefined();
			expect(def.name).toBeTruthy();
			expect(def.icon).toBeTruthy();
		}
	});

	it("emitGreenhouseAction parses seed counts from channel ack reply", () => {
		const pushMock = vi.fn().mockReturnValue({
			receive: vi.fn().mockImplementation(function (
				this: unknown,
				event: string,
				cb: (payload?: unknown) => void,
			) {
				if (event === "ok") {
					cb({ seeds: { "seed-bag": 9 } });
				}
				return this;
			}),
		});

		const channelMock = { push: pushMock };
		vi.spyOn(socketModule, "farmChannelFor").mockReturnValue(
			channelMock as unknown as ReturnType<typeof socketModule.farmChannelFor>,
		);

		let resultAck: { ok: boolean; seeds?: Record<string, number> } | undefined;
		emitGreenhouseAction(
			"Alice",
			{ kind: "insert_seed", item: "seed-bag", count: 1 },
			(res) => {
				resultAck = res;
			},
		);

		expect(resultAck?.ok).toBe(true);
		expect(resultAck?.seeds).toEqual({ "seed-bag": 9 });
	});
});
