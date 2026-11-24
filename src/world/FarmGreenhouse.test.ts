import { beforeEach, describe, expect, it } from "vitest";
import { FarmGreenhouse } from "./FarmGreenhouse";
import type { FarmPropLayer } from "./farmPropLayer";
import { useGreenhouseStore } from "./greenhouseStore";
import type { InputManager } from "./InputManager";

describe("FarmGreenhouse", () => {
	let greenhouse: FarmGreenhouse;
	let player: { pos: { x: number; y: number } };
	let props: FarmPropLayer;
	let pressedKey: string | null = null;
	let input: InputManager;

	beforeEach(() => {
		useGreenhouseStore.setState({ greenhouseOpen: false });
		greenhouse = new FarmGreenhouse(true);
		player = { pos: { x: 100, y: 100 } };
		pressedKey = null;
		input = {
			consumePress: (key: string) => {
				if (key === pressedKey) {
					pressedKey = null;
					return true;
				}
				return false;
			},
		} as unknown as InputManager;
		props = {
			greenhouseNear: (_x: number, _y: number) => ({
				index: 17,
				asset: "greenhouse",
				x: 100,
				y: 100,
				width: 260,
			}),
			pick: (_x: number, _y: number) => ({
				index: 17,
				asset: "greenhouse",
				x: 100,
				y: 100,
				width: 260,
			}),
		} as unknown as FarmPropLayer;
	});

	it("shows prompt when owner is near greenhouse", () => {
		expect(greenhouse.prompt(player, props)).toBe("Press E to open greenhouse");
	});

	it("does not show prompt for visitors", () => {
		const visitorGreenhouse = new FarmGreenhouse(false);
		expect(visitorGreenhouse.prompt(player, props)).toBeNull();
	});

	it("opens on E press when in range", () => {
		pressedKey = "KeyE";
		greenhouse.update(player, input, props);
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(true);
	});

	it("opens on click on greenhouse", () => {
		const handled = greenhouse.handleClick({ x: 100, y: 100 }, null, props);
		expect(handled).toBe(true);
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(true);
	});

	it("does not handle click when holding a shovel", () => {
		const handled = greenhouse.handleClick({ x: 100, y: 100 }, "shovel", props);
		expect(handled).toBe(false);
		expect(useGreenhouseStore.getState().greenhouseOpen).toBe(false);
	});
});
