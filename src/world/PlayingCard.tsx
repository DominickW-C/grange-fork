import { type RefObject, useLayoutEffect, useRef } from "react";
import type { Card } from "./blackjack";
import { CARD_BACK_SRC, cardArtSrc } from "./cardArt";

interface PlayingCardProps {
	card?: Card;
	faceDown?: boolean;
	/** Play the fly-from-deck animation. Only set for freshly drawn cards. */
	deal?: boolean;
	/** Stagger for cards dealt in the same batch, in milliseconds. */
	dealDelay?: number;
	/** The visible deck, used as the animation's starting point. */
	deckRef?: RefObject<HTMLDivElement> | null;
}

export function PlayingCard({
	card,
	faceDown = false,
	deal = false,
	dealDelay = 0,
	deckRef,
}: PlayingCardProps) {
	const ref = useRef<HTMLDivElement>(null);
	// Captured once: later renders must not replay the animation.
	const shouldDeal = useRef(deal).current;
	const delay = useRef(dealDelay).current;

	useLayoutEffect(() => {
		const el = ref.current;
		const deck = deckRef?.current;
		if (!shouldDeal || !el || !deck) return;
		if (
			typeof window !== "undefined" &&
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
		) {
			return;
		}
		const from = deck.getBoundingClientRect();
		const to = el.getBoundingClientRect();
		const dx = from.left - to.left + (from.width - to.width) / 2;
		const dy = from.top - to.top + (from.height - to.height) / 2;
		el.style.setProperty("--deal-x", `${dx}px`);
		el.style.setProperty("--deal-y", `${dy}px`);
		el.style.setProperty("--deal-delay", `${delay}ms`);
		el.classList.add("bj-deal-in");
		const clear = () => el.classList.remove("bj-deal-in");
		el.addEventListener("animationend", clear, { once: true });
		return () => el.removeEventListener("animationend", clear);
	}, [shouldDeal, delay, deckRef]);

	return (
		<div
			ref={ref}
			className={faceDown ? "bj-card bj-card-down" : "bj-card"}
			role="img"
			aria-label={card ? `${card.rank} of ${card.suit}` : "Face-down card"}
		>
			<div className="bj-card-inner">
				<img
					className="bj-card-front"
					src={card ? cardArtSrc(card) : undefined}
					alt=""
					draggable={false}
				/>
				<img
					className="bj-card-back"
					src={CARD_BACK_SRC}
					alt=""
					draggable={false}
				/>
			</div>
		</div>
	);
}
