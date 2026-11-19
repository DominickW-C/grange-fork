import { useEffect, useState } from "react";
import { ChatInput } from "../chat/ChatInput";
import { useChatStore } from "../chat/chatStore";
import { NOTICE_TTL_MS, useNotificationStore } from "./notificationStore";

const VISIBLE = 5;

interface NotificationFeedProps {
	/** False while a DOM window owns the screen. */
	chatEnabled: boolean;
}

/**
 * Bottom-left chat/notification feed. Fades out when no new notice has
 * arrived for `NOTICE_TTL_MS`, then fades back in on the next message. Stays
 * visible while the chat composer is open.
 */
export function NotificationFeed({ chatEnabled }: NotificationFeedProps) {
	const notices = useNotificationStore((s) => s.notices);
	const composing = useChatStore((s) => s.composing);
	const [idle, setIdle] = useState(true);

	useEffect(() => {
		if (composing) {
			setIdle(false);
			return;
		}
		if (notices.length === 0) return;
		setIdle(false);
		const timer = window.setTimeout(() => setIdle(true), NOTICE_TTL_MS);
		return () => window.clearTimeout(timer);
	}, [notices, composing]);

	const recent = notices.slice(-VISIBLE);

	return (
		<div
			data-testid="notification-feed"
			role="log"
			aria-label="Farm chat and notifications"
			aria-live="polite"
			className={`hud-feed${idle ? " hud-feed-idle" : ""}`}
		>
			<span className="hud-feed-title">Grange Chat</span>
			<ul className="hud-feed-list">
				{recent.map((notice) => (
					<li
						key={notice.id}
						className={`hud-feed-item hud-feed-${notice.kind}`}
					>
						<span className="hud-feed-author">
							[{notice.author ?? "GRANGE"}]
						</span>{" "}
						{notice.text}
					</li>
				))}
			</ul>
			<ChatInput enabled={chatEnabled} />
		</div>
	);
}
