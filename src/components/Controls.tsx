import { Group, Rect, Text } from "react-konva";
import type { Palette } from "../theme";

/** A small Konva push button used for in-board controls (Pass / Scrap Hand). */
export function GameButton({
	x,
	y,
	width,
	height,
	label,
	highlight,
	onClick,
	palette,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
	highlight?: boolean;
	onClick?: () => void;
	palette: Palette;
}) {
	const fill = highlight ? palette.wheat : palette.barnDeep;
	const stroke = highlight ? palette.wheat : palette.husk;
	const text = highlight ? palette.soil : palette.cream;

	return (
		<Group x={x} y={y} onClick={onClick} onTap={onClick}>
			<Rect
				width={width}
				height={height}
				cornerRadius={6}
				fill={fill}
				stroke={stroke}
				strokeWidth={1}
			/>
			<Text
				width={width}
				height={height}
				align="center"
				verticalAlign="middle"
				text={label}
				fontSize={12}
				fontFamily="Rye, serif"
				letterSpacing={1}
				fill={text}
				listening={false}
			/>
		</Group>
	);
}
