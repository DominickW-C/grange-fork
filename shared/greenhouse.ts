/**
 * Seed to crop mappings and helpers for the greenhouse.
 */

export const SEED_TO_CROP: Record<string, string> = {
	"wheat-seed": "wheat",
	"lettuce-seed": "lettuce",
	"tomato-seed": "tomato",
	"seed-bag": "tomato",
	"midas-wheat-seed": "midas_wheat",
	"frost-lettuce-seed": "frost_lettuce",
	"sunburst-tomato-seed": "sunburst_tomato",
};

export const CROP_TO_SEED: Record<string, string> = {
	tomato: "seed-bag",
	wheat: "wheat-seed",
	lettuce: "lettuce-seed",
	midas_wheat: "midas-wheat-seed",
	frost_lettuce: "frost-lettuce-seed",
	sunburst_tomato: "sunburst-tomato-seed",
};

export function seedToCrop(seed: string): string | null {
	return SEED_TO_CROP[seed] ?? null;
}

export function cropToSeed(crop: string): string | null {
	return CROP_TO_SEED[crop] ?? null;
}
