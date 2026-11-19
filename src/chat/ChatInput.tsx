import { useEffect, useRef } from "react";
import { useInventoryStore } from "../inventory/inventoryStore";
import { usePauseStore } from "../pause/pauseStore";
import { useTravelMenuStore } from "../world/travelMenuStore";
import { CHAT_MAX_LENGTH, sendChat } from "./chatClient";
import { useChatStore } from "./chatStore";
import { isTypingTarget } from "./typing";

interface ChatInputProps {
	/** False while a market/casino/bank/fishing window owns the screen. */
	enabled: boolean;
}

/**
 * Enter-to-chat composer inside the notification feed.
 *
 * Enter opens it from anywhere the world is interactive; Enter sends, Escape
 * cancels. While it is open the scene freezes (see `isChatComposing`) so
 * typing W/A/S/D never walks the farmer.
 */
export function ChatInput({ enabled }: ChatInputProps) {
	const composing = useChatStore((s) => s.composing);
	const draft = useChatStore((s) => s.draft);
	const open = useChatStore((s) => s.open);
	const close = useChatStore((s) => s.close);
	const setDraft = useChatStore((s) => s.setDraft);
	const paused = usePauseStore((s) => s.paused);
	const inventoryOpen = useInventoryStore((s) => s.inventoryOpen);
	const barnOpen = useInventoryStore((s) => s.barnOpen);
	const travelMenuOpen = useTravelMenuStore((s) => s.open);
	const inputRef = useRef<HTMLInputElement>(null);

	const available =
		enabled && !paused && !inventoryOpen && !barnOpen && !travelMenuOpen;

	useEffect(() => {
		if (!available && composing) close();
	}, [available, composing, close]);

	useEffect(() => {
		if (composing) inputRef.current?.focus();
	}, [composing]);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;
			if (event.code !== "Enter") return;
			if (!available) return;
			event.preventDefault();
			open();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [available, open]);

	// Escape closes the composer even if focus has wandered off the input.
	useEffect(() => {
		if (!composing) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			close();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [composing, close]);

	function submit() {
		if (sendChat(draft)) close();
	}

	if (!composing) {
		return (
			<button
				type="button"
				data-testid="chat-open"
				className="hud-chat-open"
				disabled={!available}
				onClick={() => {
					if (available) open();
				}}
			>
				[Enter] Chat
			</button>
		);
	}

	return (
		<form
			className="hud-chat-form"
			data-testid="chat-form"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<input
				ref={inputRef}
				data-testid="chat-input"
				className="hud-chat-input"
				aria-label="Chat message"
				autoComplete="off"
				maxLength={CHAT_MAX_LENGTH}
				placeholder="Say something…"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
			/>
			<button
				type="submit"
				data-testid="chat-send"
				className="hud-chat-send"
				aria-label="Send chat message"
			>
				Send
			</button>
		</form>
	);
}
