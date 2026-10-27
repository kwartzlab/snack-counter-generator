import earcut from 'earcut';
import type { Mesh, Point, Polygon } from './types';

function ringArea(flat: readonly number[], a: number, b: number, c: number): number {
	const ax = flat[a * 2] ?? 0;
	const ay = flat[a * 2 + 1] ?? 0;
	const bx = flat[b * 2] ?? 0;
	const by = flat[b * 2 + 1] ?? 0;
	const cx = flat[c * 2] ?? 0;
	const cy = flat[c * 2 + 1] ?? 0;
	return (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
}

/** Extrude outer/hole polygons into one closed mesh. Top normal is +z, bottom is -z. */
export function extrude(polygons: readonly Polygon[], z0: number, z1: number): Mesh {
	const positions: number[] = [];
	const indices: number[] = [];

	for (const polygon of polygons) {
		if (polygon.outer.length < 3) continue;
		const rings: Point[][] = [polygon.outer, ...polygon.holes.filter((hole) => hole.length >= 3)];
		const flat: number[] = [];
		const holeIndices: number[] = [];
		let count = 0;

		rings.forEach((ring, ringIndex) => {
			if (ringIndex > 0) holeIndices.push(count);
			for (const [x, y] of ring) flat.push(x, y);
			count += ring.length;
		});

		const base = positions.length / 3;
		for (let index = 0; index < count; index += 1) {
			positions.push(flat[index * 2] ?? 0, flat[index * 2 + 1] ?? 0, z0);
		}
		for (let index = 0; index < count; index += 1) {
			positions.push(flat[index * 2] ?? 0, flat[index * 2 + 1] ?? 0, z1);
		}

		const triangles = earcut(flat, holeIndices, 2);
		const capEdges = new Map<string, number>();
		const noteEdge = (from: number, to: number): void => {
			const key = `${from}>${to}`;
			capEdges.set(key, (capEdges.get(key) ?? 0) + 1);
		};

		for (let triangle = 0; triangle < triangles.length; triangle += 3) {
			let a = triangles[triangle] ?? 0;
			let b = triangles[triangle + 1] ?? 0;
			let c = triangles[triangle + 2] ?? 0;
			if (ringArea(flat, a, b, c) < 0) {
				const swap = b;
				b = c;
				c = swap;
			}
			noteEdge(a, b);
			noteEdge(b, c);
			noteEdge(c, a);
			indices.push(base + count + a, base + count + b, base + count + c);
			indices.push(base + a, base + c, base + b);
		}

		// Earcut drops collinear points, so walls follow the cap boundary rather than every input edge.
		for (const [key, uses] of capEdges) {
			if (uses !== 1) continue;
			const split = key.indexOf('>');
			const from = Number(key.slice(0, split));
			const to = Number(key.slice(split + 1));
			if ((capEdges.get(`${to}>${from}`) ?? 0) !== 0) continue;
			indices.push(base + from, base + to, base + count + to);
			indices.push(base + from, base + count + to, base + count + from);
		}
	}

	return {
		positions: Float32Array.from(positions),
		indices: Uint32Array.from(indices)
	};
}
