import { describe, expect, it } from "vitest";
import { keyGreen } from "./chromaKey";

function pixel(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
	return new Uint8ClampedArray([r, g, b, a]);
}

describe("keyGreen", () => {
	it("makes a solid green backdrop transparent", () => {
		const value = pixel(1, 254, 2);
		keyGreen(value);
		expect(value[3]).toBe(0);
	});

	it("leaves clean brown fur alone", () => {
		const value = pixel(180, 130, 80);
		keyGreen(value);
		expect(value[3]).toBe(255);
		expect(value[1]).toBe(130);
	});

	it("softens and despills a green edge", () => {
		const value = pixel(150, 190, 80);
		keyGreen(value);
		expect(value[3]).toBeGreaterThan(0);
		expect(value[3]).toBeLessThan(255);
		expect(value[1]).toBeLessThan(190);
	});

	it("despills green-tinted fur without erasing it", () => {
		const value = pixel(200, 180, 100);
		keyGreen(value);
		expect(value[3]).toBe(255);
		expect(value[1]).toBe(150);
	});

	it("does not raise the alpha of already transparent pixels", () => {
		const value = pixel(1, 254, 2, 0);
		keyGreen(value);
		expect(value[3]).toBe(0);
	});
});
