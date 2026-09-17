export interface Palette {
	soil: string;
	barn: string;
	barnDeep: string;
	barnRed: string;
	leaf: string;
	plum: string;
	pumpkin: string;
	pumpkinDeep: string;
	wheat: string;
	cream: string;
	husk: string;
}

const VARS: Record<keyof Palette, string> = {
	soil: "--soil",
	barn: "--barn",
	barnDeep: "--barn-deep",
	barnRed: "--barn-red",
	leaf: "--leaf",
	plum: "--plum",
	pumpkin: "--pumpkin",
	pumpkinDeep: "--pumpkin-deep",
	wheat: "--wheat",
	cream: "--cream",
	husk: "--husk",
};

/**
 * Reads the theme palette from the CSS variables defined in index.css.
 * Konva shapes can't use Tailwind classes, so this is the bridge between the
 * Tailwind `@theme` tokens and canvas rendering.
 */
export function getPalette(): Palette {
	const styles = getComputedStyle(document.documentElement);
	const result = {} as Palette;
	for (const key of Object.keys(VARS) as (keyof Palette)[]) {
		result[key] = styles.getPropertyValue(VARS[key]).trim();
	}
	return result;
}
