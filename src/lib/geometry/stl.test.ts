import { describe, expect, it } from 'vitest';
import { extrude } from './extrude';
import { buildStl, printableMeshes } from './stl';
import type { Parsed3mf } from './threemf';
import type { Mesh } from './types';

describe('stl', () => {
	it('writes a binary STL whose triangle count matches the mesh', () => {
		const mesh = extrude(
			[
				{
					outer: [
						[0, 0],
						[10, 0],
						[10, 10],
						[0, 10]
					],
					holes: []
				}
			],
			0,
			1
		);
		const bytes = buildStl([mesh]);
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		const triangles = mesh.indices.length / 3;

		expect(bytes.byteLength).toBe(84 + triangles * 50);
		expect(view.getUint32(80, true)).toBe(triangles);
		expect(new TextDecoder().decode(bytes.slice(0, 20))).toBe('Snack Budget Counter');
		expect(bytes[20]).toBe(0);

		let topFacing = 0;
		for (let offset = 84; offset < bytes.byteLength; offset += 50) {
			if (view.getFloat32(offset + 8, true) > 0.9) topFacing += 1;
		}
		expect(topFacing).toBe(2);
	});
});

function square(): Mesh {
	return extrude(
		[
			{
				outer: [
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 1]
				],
				holes: []
			}
		],
		0,
		1
	);
}

function baseWith(objects: Parsed3mf['objects'], buildItemIds: string[]): Parsed3mf {
	return {
		unit: 'millimeter',
		title: null,
		objects,
		buildItemIds
	};
}

describe('printableMeshes', () => {
	it('places lettering immediately after its front plate', () => {
		const plate = square();
		const dial = square();
		const text = square();
		const meshes = printableMeshes(
			baseWith(
				[
					{ id: '1', name: 'Front plate A', sourceId: 'Body3', mesh: plate, components: [] },
					{ id: '2', name: 'Dial', sourceId: 'Body1', mesh: dial, components: [] }
				],
				['1', '2']
			),
			new Map([['Body3', text]])
		);
		expect(meshes).toEqual([plate, text, dial]);
	});

	it('skips an empty lettering mesh', () => {
		const plate = square();
		const empty: Mesh = { positions: new Float32Array(), indices: new Uint32Array() };
		const meshes = printableMeshes(
			baseWith([{ id: '1', name: 'Front plate A', sourceId: 'Body3', mesh: plate, components: [] }], ['1']),
			new Map([['Body3', empty]])
		);
		expect(meshes).toEqual([plate]);
	});

	it('throws when a build item has no mesh', () => {
		expect(() =>
			printableMeshes(
				baseWith([{ id: '4', name: 'Missing', sourceId: null, mesh: null, components: [] }], ['4']),
				new Map()
			)
		).toThrow('Base part 4 has no mesh');
	});
});
