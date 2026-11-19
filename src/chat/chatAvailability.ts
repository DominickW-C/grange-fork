/**
 * Whether chat may take the keyboard right now.
 *
 * Every DOM window that owns the screen (market, casino table, bank desk,
 * livestock pen, fishing, farmhouse settings, farmhand) also owns Enter, so
 * the composer stays closed while any of them is open.
 */
export function chatAvailable(...openWindows: unknown[]): boolean {
	return !openWindows.some(Boolean);
}
