import { useEffect } from "react";
import type { WorldArea } from "../world/WalkingScene";
import { enterTownChat, leaveTownChat } from "./chatClient";

/**
 * Keeps the town chat room joined exactly while the player is outside a farm.
 *
 * Farms bind their own room on the `farm:<owner>` channel (see `socket.ts`),
 * so this hook only owns the shared town room.
 */
export function useChatRoom(area: WorldArea): void {
	useEffect(() => {
		if (area === "Farm") leaveTownChat();
		else enterTownChat();
	}, [area]);

	useEffect(() => leaveTownChat, []);
}
