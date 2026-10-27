import type { Mesh } from './types';

export interface MeshHealth {
	manifold: boolean;
	volume: number;
}

/** Positive when triangle normals point outward. */
export function signedVolume(mesh: Mesh): number {
	const { positions, indices } = mesh;
	let volume = 0;
	for (let index = 0; index < indices.length; index += 3) {
		const a = (indices[index] ?? 0) * 3;
		const b = (indices[index + 1] ?? 0) * 3;
		const c = (indices[index + 2] ?? 0) * 3;
		const ax = positions[a] ?? 0;
		const ay = positions[a + 1] ?? 0;
		const az = positions[a + 2] ?? 0;
		const bx = positions[b] ?? 0;
		const by = positions[b + 1] ?? 0;
		const bz = positions[b + 2] ?? 0;
		const cx = positions[c] ?? 0;
		const cy = positions[c + 1] ?? 0;
		const cz = positions[c + 2] ?? 0;
		volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
	}
	return volume / 6;
}

/**
 * Every directed edge is used once, and its reverse is used once.
 * That is an edge-manifold mesh with consistent winding.
 */
export function isEdgeManifold(mesh: Mesh): boolean {
	const { indices, positions } = mesh;
	if (indices.length === 0 || indices.length % 3 !== 0) return false;
	const vertexCount = positions.length / 3;
	const directed = new Map<string, number>();

	const add = (from: number, to: number): boolean => {
		if (from < 0 || to < 0 || from >= vertexCount || to >= vertexCount) return false;
		const key = `${from}>${to}`;
		directed.set(key, (directed.get(key) ?? 0) + 1);
		return true;
	};

	for (let index = 0; index < indices.length; index += 3) {
		const a = indices[index] ?? 0;
		const b = indices[index + 1] ?? 0;
		const c = indices[index + 2] ?? 0;
		if (!add(a, b) || !add(b, c) || !add(c, a)) return false;
	}

	for (const [key, count] of directed) {
		if (count !== 1) return false;
		const split = key.indexOf('>');
		const reverse = `${key.slice(split + 1)}>${key.slice(0, split)}`;
		if (directed.get(reverse) !== 1) return false;
	}
	return true;
}

export function meshHealth(mesh: Mesh): MeshHealth {
	return {
		manifold: isEdgeManifold(mesh),
		volume: signedVolume(mesh)
	};
}
