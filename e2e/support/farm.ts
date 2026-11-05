import { expect, type Page } from "@playwright/test";
import { MAP_COLUMNS, MAP_ROWS } from "../../src/world/mapData";

/**
 * The page-space center of a world point, given in map pixels.
 *
 * Excalibur's FitContainer keeps the canvas at the map's aspect ratio, so a
 * world coordinate is a simple fraction of the canvas box.
 */
export async function worldPoint(
	page: Page,
	worldX: number,
	worldY: number,
): Promise<{ x: number; y: number }> {
	const box = await page.locator(".farm-map-canvas").boundingBox();
	expect(box).not.toBeNull();
	if (!box) throw new Error("the world canvas is not laid out");
	return {
		x: box.x + (worldX / 1152) * box.width,
		y: box.y + (worldY / 768) * box.height,
	};
}

/** Clicks a point given in world pixels. */
export async function clickWorld(
	page: Page,
	worldX: number,
	worldY: number,
): Promise<void> {
	const point = await worldPoint(page, worldX, worldY);
	await page.mouse.click(point.x, point.y);
}

/**
 * The page-space center of a farm map tile (0-based map coordinates).
 * `MAP_COLUMNS`/`MAP_ROWS` come from the same data the game renders with, so
 * the click math can't drift away from the real grid when tiles are redrawn or
 * the layout is restyled.
 */
export async function farmTilePosition(
	page: Page,
	column: number,
	row: number,
): Promise<{ x: number; y: number }> {
	const box = await page.locator("canvas.farm-map-canvas").boundingBox();
	expect(box).not.toBeNull();
	if (!box) throw new Error("the world canvas is not laid out");
	return {
		x: box.x + ((column + 0.5) / MAP_COLUMNS) * box.width,
		y: box.y + ((row + 0.5) / MAP_ROWS) * box.height,
	};
}

/** Moves the pointer over the center of a farm map tile. */
export async function hoverFarmTile(
	page: Page,
	column: number,
	row: number,
): Promise<void> {
	const { x, y } = await farmTilePosition(page, column, row);
	await page.mouse.move(x, y);
}

/** Clicks the center of a farm map tile. */
export async function clickFarmTile(
	page: Page,
	column: number,
	row: number,
): Promise<void> {
	const { x, y } = await farmTilePosition(page, column, row);
	await page.mouse.click(x, y);
}

/** Samples a rendered farm tile's center pixel from a canvas screenshot. */
export async function farmTilePixel(
	page: Page,
	column: number,
	row: number,
): Promise<{ r: number; g: number; b: number }> {
	const buf = await page.locator("canvas.farm-map-canvas").screenshot();
	const b64 = buf.toString("base64");
	return page.evaluate(
		async ({ b64, xf, yf }) => {
			const img = new Image();
			img.src = `data:image/png;base64,${b64}`;
			await img.decode();
			const canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("no 2d context");
			ctx.drawImage(img, 0, 0);
			const d = ctx.getImageData(
				Math.floor(xf * img.width),
				Math.floor(yf * img.height),
				1,
				1,
			).data;
			return { r: d[0], g: d[1], b: d[2] };
		},
		{ b64, xf: (column + 0.5) / MAP_COLUMNS, yf: (row + 0.5) / MAP_ROWS },
	);
}
