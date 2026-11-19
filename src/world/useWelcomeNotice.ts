import { useEffect } from "react";
import { useNotificationStore } from "../notifications/notificationStore";

/**
 * Announces whose farm the player just entered in the notification feed, so
 * the feed always has a `[GRANGE]` line beside the room's chat.
 */
export function useWelcomeNotice(
	target: string | undefined,
	isOwner: boolean,
): void {
	const pushNotice = useNotificationStore((s) => s.push);

	useEffect(() => {
		if (!target) return;
		pushNotice(
			isOwner ? "Welcome to your farm." : `Visiting ${target}'s farm.`,
			"system",
		);
	}, [target, isOwner, pushNotice]);
}
