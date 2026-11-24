import { describe, expect, it } from "vitest";
import { cropToSeed, seedToCrop } from "../../shared/greenhouse";
import {
	GREENHOUSE_REACH,
	opensGreenhouse,
	withinGreenhouseReach,
} from "./greenhouseActions";

describe("greenhouseActions", () => {
	const greenhouse = { x: 500, y: 300, width: 260, height: 160 };

	describe("withinGreenhouseReach", () => {
		it("detects player inside interaction margin", () => {
			expect(withinGreenhouseReach({ x: 500, y: 300 }, greenhouse)).toBe(true);
			expect(
				withinGreenhouseReach(
					{ x: 500 + 130 + GREENHOUSE_REACH - 2, y: 300 },
					greenhouse,
				),
			).toBe(true);
			expect(
				withinGreenhouseReach(
					{ x: 500, y: 300 - 160 - GREENHOUSE_REACH + 2 },
					greenhouse,
				),
			).toBe(true);
		});

		it("rejects player outside interaction reach", () => {
			expect(
				withinGreenhouseReach(
					{ x: 500 + 130 + GREENHOUSE_REACH + 20, y: 300 },
					greenhouse,
				),
			).toBe(false);
			expect(withinGreenhouseReach({ x: 100, y: 100 }, greenhouse)).toBe(false);
		});
	});

	describe("opensGreenhouse", () => {
		it("allows owner without shovel to open greenhouse", () => {
			expect(opensGreenhouse(true, null, "greenhouse")).toBe(true);
			expect(opensGreenhouse(true, "wheat-seed", "greenhouse")).toBe(true);
		});

		it("blocks shovel from opening so the building can be moved", () => {
			expect(opensGreenhouse(true, "shovel", "greenhouse")).toBe(false);
		});

		it("rejects visitors or non-greenhouse assets", () => {
			expect(opensGreenhouse(false, null, "greenhouse")).toBe(false);
			expect(opensGreenhouse(true, null, "barn")).toBe(false);
			expect(opensGreenhouse(true, null, undefined)).toBe(false);
		});
	});

	describe("seedToCrop", () => {
		it("maps seeds to their produced crop", () => {
			expect(seedToCrop("wheat-seed")).toBe("wheat");
			expect(seedToCrop("lettuce-seed")).toBe("lettuce");
			expect(seedToCrop("tomato-seed")).toBe("tomato");
			expect(seedToCrop("seed-bag")).toBe("tomato");
			expect(seedToCrop("midas-wheat-seed")).toBe("midas_wheat");
			expect(seedToCrop("frost-lettuce-seed")).toBe("frost_lettuce");
			expect(seedToCrop("sunburst-tomato-seed")).toBe("sunburst_tomato");
			expect(seedToCrop("hoe")).toBeNull();
		});
	});

	describe("cropToSeed", () => {
		it("maps crops back to canonical inventory seed item IDs", () => {
			expect(cropToSeed("tomato")).toBe("seed-bag");
			expect(cropToSeed("wheat")).toBe("wheat-seed");
			expect(cropToSeed("lettuce")).toBe("lettuce-seed");
			expect(cropToSeed("midas_wheat")).toBe("midas-wheat-seed");
			expect(cropToSeed("frost_lettuce")).toBe("frost-lettuce-seed");
			expect(cropToSeed("sunburst_tomato")).toBe("sunburst-tomato-seed");
			expect(cropToSeed("unknown")).toBeNull();
		});
	});
});
