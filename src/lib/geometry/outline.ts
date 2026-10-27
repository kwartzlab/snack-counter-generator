import type { PathCommand } from 'opentype.js';
import type { Point, Polygon } from './types';

const DUPLICATE_DISTANCE = 1e-6;

function pushPoint(contour: Point[], x: number, y: number): void {
	contour.push([x, -y]);
}

/** Flatten an opentype path into open-free contours in a y-up space. */
export function flattenPath(commands: readonly PathCommand[]): Point[][] {
	const contours: Point[][] = [];
	let current: Point[] | null = null;
	let px = 0;
	let py = 0;

	const push = (x: number, y: number): void => {
		if (!current) current = [];
		pushPoint(current, x, y);
		px = x;
		py = y;
	};

	for (const command of commands) {
		if (command.type === 'M') {
			if (current && current.length > 2) contours.push(current);
			current = [];
			push(command.x ?? 0, command.y ?? 0);
		} else if (command.type === 'L') {
			push(command.x ?? 0, command.y ?? 0);
		} else if (command.type === 'Q') {
			const x0 = px;
			const y0 = py;
			const segments = 8;
			for (let step = 1; step <= segments; step += 1) {
				const t = step / segments;
				const u = 1 - t;
				push(
					u * u * x0 + 2 * u * t * (command.x1 ?? 0) + t * t * (command.x ?? 0),
					u * u * y0 + 2 * u * t * (command.y1 ?? 0) + t * t * (command.y ?? 0)
				);
			}
		} else if (command.type === 'C') {
			const x0 = px;
			const y0 = py;
			const segments = 10;
			for (let step = 1; step <= segments; step += 1) {
				const t = step / segments;
				const u = 1 - t;
				push(
					u * u * u * x0 +
						3 * u * u * t * (command.x1 ?? 0) +
						3 * u * t * t * (command.x2 ?? 0) +
						t * t * t * (command.x ?? 0),
					u * u * u * y0 +
						3 * u * u * t * (command.y1 ?? 0) +
						3 * u * t * t * (command.y2 ?? 0) +
						t * t * t * (command.y ?? 0)
				);
			}
		} else if (command.type === 'Z') {
			if (current && current.length > 2) contours.push(current);
			current = null;
		}
	}

	if (current && current.length > 2) contours.push(current);

	return contours
		.map((contour) => {
			const cleaned: Point[] = [];
			for (const point of contour) {
				const previous = cleaned[cleaned.length - 1];
				if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > DUPLICATE_DISTANCE) {
					cleaned.push(point);
				}
			}
			const first = cleaned[0];
			const last = cleaned[cleaned.length - 1];
			if (
				first &&
				last &&
				cleaned.length > 1 &&
				Math.hypot(first[0] - last[0], first[1] - last[1]) < DUPLICATE_DISTANCE
			) {
				cleaned.pop();
			}
			return cleaned;
		})
		.filter((contour) => contour.length > 2);
}

/** Signed area. Positive means counter-clockwise in y-up coordinates. */
export function signedArea(contour: readonly Point[]): number {
	let sum = 0;
	for (let index = 0, previous = contour.length - 1; index < contour.length; previous = index, index += 1) {
		const current = contour[index];
		const prior = contour[previous];
		if (!current || !prior) continue;
		sum += (prior[0] - current[0]) * (prior[1] + current[1]);
	}
	return sum / 2;
}

function containsPoint(point: Point, contour: readonly Point[]): boolean {
	let inside = false;
	for (let index = 0, previous = contour.length - 1; index < contour.length; previous = index, index += 1) {
		const current = contour[index];
		const prior = contour[previous];
		if (!current || !prior) continue;
		const crosses =
			current[1] > point[1] !== prior[1] > point[1] &&
			point[0] < ((prior[0] - current[0]) * (point[1] - current[1])) / (prior[1] - current[1]) + current[0];
		if (crosses) inside = !inside;
	}
	return inside;
}

interface ContourInfo {
	points: Point[];
	area: number;
	depth: number;
	parent: number;
}

/**
 * Group contours by nesting. Even depth is an outer, odd depth is a hole.
 * Winding is ignored because TrueType and CFF fonts disagree.
 */
export function groupContours(contours: readonly Point[][]): Polygon[] {
	const info: ContourInfo[] = contours.map((points) => ({
		points,
		area: Math.abs(signedArea(points)),
		depth: 0,
		parent: -1
	}));

	info.forEach((contour, index) => {
		let parent = -1;
		info.forEach((other, otherIndex) => {
			const sample = contour.points[0];
			if (index === otherIndex || !sample || other.area <= contour.area) return;
			if (!containsPoint(sample, other.points)) return;
			contour.depth += 1;
			if (parent < 0 || other.area < (info[parent]?.area ?? Infinity)) parent = otherIndex;
		});
		contour.parent = parent;
	});

	const polygons: (Polygon & { index: number })[] = [];
	info.forEach((contour, index) => {
		if (contour.depth % 2 === 0) {
			polygons.push({ outer: contour.points, holes: [], index });
		}
	});

	for (const contour of info) {
		if (contour.depth % 2 !== 1) continue;
		const parent = polygons.find((polygon) => polygon.index === contour.parent);
		if (parent) parent.holes.push(contour.points);
	}

	return polygons.map(({ outer, holes }) => ({ outer, holes }));
}
