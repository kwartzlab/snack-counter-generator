import { signedArea } from './outline';
import type { LineLayout, Point, Polygon } from './types';

function reverseIf(points: Point[], whenPositive: boolean): Point[] {
	const area = signedArea(points);
	if (whenPositive ? area > 0 : area < 0) return points.slice().reverse();
	return points;
}

/**
 * Centre a line on a plate band and mirror it in X.
 * The part is read from the bed side, so model X flips about centerX. Y does not.
 */
export function placeLine(line: LineLayout, centerX: number, bandY: number): Polygon[] {
	const textCentreX = line.x0 + line.widthMm / 2;
	const mapPoint = ([x, y]: Point): Point => [
		centerX - (x - textCentreX),
		bandY + (y - line.capHeightMm / 2)
	];

	return line.polygons.map((polygon) => ({
		outer: reverseIf(polygon.outer.map(mapPoint), false),
		holes: polygon.holes.map((hole) => reverseIf(hole.map(mapPoint), true))
	}));
}
