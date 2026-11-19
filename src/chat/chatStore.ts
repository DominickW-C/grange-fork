import { create } from "zustand";

interface ChatState {
	/** True while the chat input owns the keyboard. */
	composing: boolean;
	draft: string;
	open: () => void;
	close: () => void;
	setDraft: (draft: string) => void;
}

/**
 * Minimal chat composer state. Kept apart from the notification feed because
 * the Excalibur input pipeline has to poll it without subscribing.
 */
export const useChatStore = create<ChatState>((set) => ({
	composing: false,
	draft: "",
	open: () => set({ composing: true }),
	close: () => set({ composing: false, draft: "" }),
	setDraft: (draft) => set({ draft }),
}));

/** Non-reactive check for the per-frame input path. */
export function isChatComposing(): boolean {
	return useChatStore.getState().composing;
}
