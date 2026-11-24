import { useEffect } from "react";
import { useGameStore } from "../store";
import { GreenhouseWindow } from "./GreenhouseWindow";
import { useGreenhouseStore } from "./greenhouseStore";

/**
 * Renders the greenhouse window from within the HUD. It reads the owner and
 * the open flag from the stores so `FarmMap` stays small, and only the owner
 * of the visited farm ever sees it.
 */
export function GreenhouseOverlay() {
	const open = useGreenhouseStore((s) => s.greenhouseOpen);
	const setOpen = useGreenhouseStore((s) => s.setGreenhouseOpen);
	const username = useGameStore((s) => s.username);
	const owner = useGameStore((s) => s.activeFarm?.owner);

	// Leaving the world unmounts the overlay; make sure the flag resets.
	useEffect(() => () => setOpen(false), [setOpen]);

	if (!open || !owner || owner !== username) return null;
	return <GreenhouseWindow owner={owner} onClose={() => setOpen(false)} />;
}
