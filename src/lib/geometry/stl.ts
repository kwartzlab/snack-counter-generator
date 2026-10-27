import type { Parsed3mf } from './threemf';
import type { Mesh } from './types';

/** Base parts in build order, with each front plate's lettering mesh after its plate. */
export function printableMeshes(base: Parsed3mf, lettering: ReadonlyMap<string, Mesh>): Mesh[] {
	const byId = new Map(base.objects.map((object) => [object.id, object]));
	const meshes: Mesh[] = [];
	for (const id of base.buildItemIds) {
		const object = byId.get(id);
		if (!object?.mesh) throw new Error(`Base part ${id} has no mesh`);
		meshes.push(object.mesh);
		if (!object.sourceId) continue;
		const text = lettering.get(object.sourceId);
		if (text && text.indices.length > 0) meshes.push(text);
	}
	return meshes;
}

const HEADER = 'Snack Budget Counter';

function normal(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number): [number, number, number] {
	const abx = bx - ax;
	const aby = by - ay;
	const abz = bz - az;
	const acx = cx - ax;
	const acy = cy - ay;
	const acz = cz - az;
	const x = aby * acz - abz * acy;
	const y = abz * acx - abx * acz;
	const z = abx * acy - aby * acx;
	const length = Math.hypot(x, y, z);
	if (length === 0) return [0, 0, 0];
	return [x / length, y / length, z / length];
}

/** Binary STL of every mesh, in the order given. Units stay millimetres. */
export function buildStl(meshes: readonly Mesh[]): Uint8Array {
	let triangles = 0;
	for (const mesh of meshes) triangles += mesh.indices.length / 3;

	const buffer = new ArrayBuffer(84 + triangles * 50);
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	bytes.set(new TextEncoder().encode(HEADER).subarray(0, 80));
	view.setUint32(80, triangles, true);

	let offset = 84;
	for (const mesh of meshes) {
		const { positions, indices } = mesh;
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
			const [nx, ny, nz] = normal(ax, ay, az, bx, by, bz, cx, cy, cz);
			view.setFloat32(offset, nx, true);
			view.setFloat32(offset + 4, ny, true);
			view.setFloat32(offset + 8, nz, true);
			view.setFloat32(offset + 12, ax, true);
			view.setFloat32(offset + 16, ay, true);
			view.setFloat32(offset + 20, az, true);
			view.setFloat32(offset + 24, bx, true);
			view.setFloat32(offset + 28, by, true);
			view.setFloat32(offset + 32, bz, true);
			view.setFloat32(offset + 36, cx, true);
			view.setFloat32(offset + 40, cy, true);
			view.setFloat32(offset + 44, cz, true);
			view.setUint16(offset + 48, 0, true);
			offset += 50;
		}
	}

	return bytes;
}
