import type { ItemId } from "../inventory/items";
import { isMovablePropAsset } from "./mapData";

/**
 * Whether a click should open the greenhouse rather than run the held tool.
 * Digging with the shovel and placing a movable prop keep priority, so the
 * greenhouse stays an ordinary placeable object.
 */
export function opensGreenhouse(
	isOwner: boolean,
	item: ItemId | null,
	asset: string | undefined,
): boolean {
	if (!isOwner || asset !== "greenhouse") return false;
	if (item === "shovel") return false;
	return item === null || !isMovablePropAsset(item);
}

/** How far past the greenhouse's sprite the player can stand and still interact. */
export const GREENHOUSE_REACH = 48;

/**
 * Whether the player is close enough to the greenhouse for its interact prompt.
 */
export function withinGreenhouseReach(
	player: { x: number; y: number },
	greenhouse: { x: number; y: number; width: number; height: number },
	margin = GREENHOUSE_REACH,
): boolean {
	return (
		player.x >= greenhouse.x - greenhouse.width / 2 - margin &&
		player.x <= greenhouse.x + greenhouse.width / 2 + margin &&
		player.y >= greenhouse.y - greenhouse.height - margin &&
		player.y <= greenhouse.y + margin
	);
}
