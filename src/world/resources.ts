import * as ex from "excalibur";
import { fenceResources } from "./fenceResources";
import type { PropKey, TerrainKey } from "./mapData";
import { farmerImage } from "./farmerSprite";

export const image = (path: string) =>
	new ex.ImageSource(`/assets/${path}`, {
		filtering: ex.ImageFiltering.Pixel,
	});

export const terrainImage = image("farm/terrain.webp");
export const trainImage = image("transport/starter-train.webp");
export const trainTracksImage = image("transport/train-tracks.webp");
/** The two extra wheel poses the train cycles through while it is moving. The
 * parked art (`trainImage`) is the third pose, so the loop reads end to end. */
export const trainFrameImages = [
	image("transport/train-animation-1.webp"),
	image("transport/train-animation-2.webp"),
];
/** Smoke puffs cycled small -> med -> big in lockstep with the three wheel
 * poses while the train is moving. */
export const smokeSmallImage = image("transport/smokeSmall.png");
export const smokeMedImage = image("transport/smokeMed.png");
export const smokeBigImage = image("transport/smokeBig.png");
export const smokeImages = [smokeSmallImage, smokeMedImage, smokeBigImage];

export const sproutImage = image("farm/plants/sprout.webp");
export const tomatoPlantImage = image("farm/plants/tomato-plant.webp");

export const cropImages = {
	sprout: sproutImage,
	"tomato-plant": tomatoPlantImage,
};

export const propImages: Record<PropKey, ex.ImageSource> = {
	farmhouse: image("farm/buildings/farmhouse.webp"),
	barn: image("farm/buildings/barn.webp"),
	"oak-tree": image("farm/plants/oak-tree.webp"),
	"pine-tree": image("farm/plants/pine-tree.webp"),
	"apple-tree": image("farm/plants/apple-tree.webp"),
	well: image("farm/objects/well.webp"),
	bench: image("farm/objects/bench.webp"),
	sign: image("farm/objects/sign.webp"),
	barrel: image("farm/objects/barrel.webp"),
	crate: image("farm/objects/crate.webp"),
	daisies: image("farm/plants/daisies.webp"),
	marigolds: image("farm/plants/marigolds.webp"),
	"blue-flowers": image("farm/plants/blue-flowers.webp"),
	"starter-train": trainImage,
};

export const resources = [
	terrainImage,
	...fenceResources,
	farmerImage,
	trainTracksImage,
	...trainFrameImages,
	...smokeImages,
	...Object.values(propImages),
	...Object.values(cropImages),
];

export const terrainFrames: Record<
	TerrainKey,
	{ column: number; row: number }
> = {
	grass: { column: 0, row: 0 },
	"grass-tufts": { column: 1, row: 0 },
	"grass-flowers": { column: 2, row: 0 },
	"path-horizontal": { column: 0, row: 1 },
	"path-vertical": { column: 1, row: 1 },
	"path-cross": { column: 2, row: 1 },
	"tilled-dry": { column: 3, row: 2 },
	"shore-north": { column: 1, row: 3 },
	water: { column: 0, row: 3 },
	"tilled-watered": { column: 3, row: 3 },
};
