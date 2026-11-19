import { create } from "zustand";

export type NoticeKind = "chat" | "system" | "error" | "player";

export interface Notice {
	id: number;
	text: string;
	kind: NoticeKind;
	/** Player chat lines carry their author; game notices are `[GRANGE]`. */
	author?: string;
	/** Epoch ms; the feed fades once the newest notice goes stale. */
	at: number;
}

/** How long a notice stays visible before the feed fades out. */
export const NOTICE_TTL_MS = 6_000;

/** Cap the backlog so a chatty room can't grow the feed without bound. */
const MAX_NOTICES = 30;

let nextId = 1;

interface NotificationState {
	notices: Notice[];
	push: (text: string, kind?: NoticeKind) => void;
	/** Appends a room chat line; `author` comes from the server. */
	pushChat: (author: string, text: string) => void;
	/** Drops player chat and keeps game notices, e.g. when changing rooms. */
	clearPlayerMessages: () => void;
	clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
	notices: [],
	push: (text, kind = "chat") => {
		const trimmed = text.trim();
		if (!trimmed) return;
		set((state) => {
			const last = state.notices[state.notices.length - 1];
			// Collapse immediate duplicates (e.g. a held tool re-emitting
			// the same hint on every frame). Chat lines are exempt: two
			// players may say the same thing back to back.
			if (
				last &&
				last.author === undefined &&
				last.text === trimmed &&
				Date.now() - last.at < 750
			) {
				return state;
			}
			const next = [
				...state.notices,
				{ id: nextId++, text: trimmed, kind, at: Date.now() },
			];
			return { notices: next.slice(-MAX_NOTICES) };
		});
	},
	pushChat: (author, text) => {
		const trimmed = text.trim();
		const name = author.trim();
		if (!trimmed || !name) return;
		set((state) => ({
			notices: [
				...state.notices,
				{
					id: nextId++,
					text: trimmed,
					kind: "player" as const,
					author: name,
					at: Date.now(),
				},
			].slice(-MAX_NOTICES),
		}));
	},
	clearPlayerMessages: () =>
		set((state) => ({
			notices: state.notices.filter((notice) => notice.author === undefined),
		})),
	clear: () => set({ notices: [] }),
}));
