import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationStore } from "./notificationStore";

describe("notification store", () => {
	beforeEach(() => {
		useNotificationStore.getState().clear();
	});

	it("keeps game notices authorless so the feed can prefix GRANGE", () => {
		useNotificationStore.getState().push("Welcome to your farm.", "system");

		const [notice] = useNotificationStore.getState().notices;
		expect(notice.author).toBeUndefined();
		expect(notice.text).toBe("Welcome to your farm.");
	});

	it("tags player chat with its author and kind", () => {
		useNotificationStore.getState().pushChat("Alice", "  hello  ");

		const [notice] = useNotificationStore.getState().notices;
		expect(notice).toMatchObject({
			author: "Alice",
			text: "hello",
			kind: "player",
		});
	});

	it("ignores blank chat lines", () => {
		useNotificationStore.getState().pushChat("Alice", "   ");
		useNotificationStore.getState().pushChat("  ", "hi");

		expect(useNotificationStore.getState().notices).toHaveLength(0);
	});

	it("does not collapse two identical player lines", () => {
		const store = useNotificationStore.getState();
		store.pushChat("Alice", "same");
		store.pushChat("Alice", "same");

		expect(useNotificationStore.getState().notices).toHaveLength(2);
	});

	it("still collapses repeated game hints", () => {
		const store = useNotificationStore.getState();
		store.push("Hoe: click or drag on grass to till.", "system");
		store.push("Hoe: click or drag on grass to till.", "system");

		expect(useNotificationStore.getState().notices).toHaveLength(1);
	});

	it("clears only player chat when the room changes", () => {
		const store = useNotificationStore.getState();
		store.push("Welcome to your farm.", "system");
		store.pushChat("Alice", "hello");

		useNotificationStore.getState().clearPlayerMessages();

		const notices = useNotificationStore.getState().notices;
		expect(notices).toHaveLength(1);
		expect(notices[0].text).toBe("Welcome to your farm.");
	});
});
