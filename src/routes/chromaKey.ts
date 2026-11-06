/** Chroma distance at which keying starts and at which it is fully opaque. */
export const KEY_LO = 30;
export const KEY_HI = 80;

/**
 * Turns green-dominant pixels transparent and pulls green spill out of the
 * softened edges. The clip has a solid (0, 255, 0) backdrop, so a simple
 * channel-distance key is enough.
 */
export function keyGreen(data: Uint8ClampedArray): void {
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const max = Math.max(r, b);
		const chroma = g - max;
		const average = (r + b) / 2;

		// Despill: a pixel does not have to be green-dominant to carry spill.
		// Motion-blurred fur can have red > green and still look olive because
		// blue is low, so pull green down whenever it rises above the red/blue
		// average.
		if (g > average) data[i + 1] = Math.round(average);

		if (chroma > KEY_HI) {
			data[i + 3] = 0;
		} else if (chroma > KEY_LO) {
			const keep = (KEY_HI - chroma) / (KEY_HI - KEY_LO);
			data[i + 3] = Math.round(data[i + 3] * keep);
		}
	}
}
