import type { GreenhouseAction } from "../../shared/types";
import { farmChannelFor, reasonOf } from "../socket";

export interface GreenhouseAck {
	ok: boolean;
	error?: string;
	seeds?: Record<string, number>;
}

export function emitGreenhouseAction(
	owner: string,
	action: GreenhouseAction,
	cb?: (res: GreenhouseAck) => void,
): void {
	const channel = farmChannelFor(owner);
	if (!channel) {
		cb?.({ ok: false, error: "not visiting farm" });
		return;
	}

	channel
		.push("greenhouseAction", { action })
		.receive("ok", (payload: unknown) => {
			const res = (payload as { seeds?: Record<string, number> }) ?? {};
			cb?.({ ok: true, seeds: res.seeds });
		})
		.receive("error", (payload: unknown) =>
			cb?.({
				ok: false,
				error: reasonOf(payload) ?? "Could not update greenhouse",
			}),
		)
		.receive("timeout", () => cb?.({ ok: false, error: "Timed out" }));
}
