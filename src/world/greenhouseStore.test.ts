import { beforeEach, describe, expect, it } from "vitest";
import {
	isInventoryBlockingInput,
	useInventoryStore,
} from "../inventory/inventoryStore";
import { usePauseStore } from "../pause/pauseStore";
import { useGreenhouseStore } from "./greenhouseStore";

describe("greenhouseStore", () => {
	beforeEach(() => {
		useGreenhouseStore.setState({ greenhouseOpen: false });
		useInventoryStore.setState({ inventoryOpen: false, barnOpen: false });
		usePauseStore.setState({ paused: false });
	});

	it("defaults to closed", () => {
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(false);
	});

	it("opens and closes via setGreenhouseOpen", () => {
		useGreenhouseStore.getState().setGreenhouseOpen(true);
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(true);

		useGreenhouseStore.getState().setGreenhouseOpen(false);
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(false);
	});

	it("blocks inventory input when greenhouse is open", () => {
		expect(isInventoryBlockingInput()).toBe(false);

		useGreenhouseStore.getState().setGreenhouseOpen(true);
		expect(isInventoryBlockingInput()).toBe(true);

		useGreenhouseStore.getState().setGreenhouseOpen(false);
		expect(isInventoryBlockingInput()).toBe(false);
	});
});
