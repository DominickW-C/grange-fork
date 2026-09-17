import { Group, Rect } from "react-konva";
import type { Palette } from "../theme";

/** A simple procedural card back (no image assets), sized to fit. */
export function CardBack({
	x,
	y,
	width,
	height,
	palette,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	palette: Palette;
}) {
	return (
		<Group x={x} y={y}>
			<Rect
				width={width}
				height={height}
				cornerRadius={6}
				fill={palette.barnDeep}
				stroke={palette.husk}
				strokeWidth={1}
			/>
			<Rect
				x={width * 0.25}
				y={height * 0.25}
				width={width * 0.5}
				height={height * 0.5}
				cornerRadius={4}
				stroke={palette.husk}
				strokeWidth={1}
			/>
		</Group>
	);
}
