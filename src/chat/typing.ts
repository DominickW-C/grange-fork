/** True when a keystroke belongs to a form field rather than the game. */
export function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName.toLowerCase();
	return (
		tag === "input" ||
		tag === "textarea" ||
		tag === "select" ||
		target.isContentEditable
	);
}
