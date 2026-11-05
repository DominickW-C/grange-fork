import type { WorldSceneName } from "./WalkingScene";

/**
 * Areas the world route may boot straight into during end-to-end runs.
 *
 * `farm-map` is the normal start and is included so the query parameter can be
 * used to force it after a previous test left an arrival flag behind.
 */
const STARTABLE_AREAS: readonly WorldSceneName[] = [
	"farm-map",
	"marketplace",
	"casino",
	"livestock-market",
	"bank",
];

/**
 * E2E hooks are compiled into dev builds only: the Phoenix shell injects a
 * `grange-test-routes` meta tag when `enable_test_routes` is on, which mirrors
 * the compile-time guard around the `/api/reset` route. Production releases
 * never see the tag, so these helpers stay inert there.
 */
const enabled =
	typeof document !== "undefined" &&
	document
		.querySelector('meta[name="grange-test-routes"]')
		?.getAttribute("content") === "true";

/** True when the dev-only e2e hooks are available. */
export function testMode(): boolean {
	return enabled;
}

/**
 * The scene the world should boot into, from `?area=`, or null.
 *
 * Only honored in test mode; a production player always starts on the farm.
 */
export function requestedStartArea(): WorldSceneName | null {
	if (!enabled || typeof window === "undefined") return null;
	const area = new URLSearchParams(window.location.search).get("area");
	if (!area) return null;
	return STARTABLE_AREAS.includes(area as WorldSceneName)
		? (area as WorldSceneName)
		: null;
}

/**
 * Multiplier applied to walking speed in all world scenes. E2E runs walk twice
 * as fast so navigation-heavy specs stay quick; normal play is unchanged.
 */
export const WALK_SPEED_MULTIPLIER = enabled ? 2 : 1;
