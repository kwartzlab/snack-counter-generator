import { describe, expect, it } from 'vitest';
import { loadPlates } from './plates';

function plate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		sourceId: 'Body3',
		label: 'A',
		name: 'Front plate A',
		maxWidthMm: 30,
		capHeightMm: 2.6,
		centerX: 0,
		centerY: 0,
		taglineBandY: 12,
		nameBandY: -11,
		bedFaceOutline: [
			[
				[0, 0],
				[1, 0],
				[0, 1]
			]
		],
		...overrides
	};
}

function spec(overrides: Record<string, unknown> = {}, plateOverrides: Record<string, unknown> = {}) {
	return {
		bedFaceZ: -2,
		textDepth: 0.8,
		textOverlapIntoPlate: 0.1,
		minCapHeightMm: 1.8,
		plates: [plate(plateOverrides)],
		...overrides
	};
}

describe('loadPlates', () => {
	it('reads the shipped plate placements', () => {
		const loaded = loadPlates();
		expect(loaded.bedFaceZ).toBe(-2);
		expect(loaded.textDepth).toBe(0.8);
		expect(loaded.textOverlapIntoPlate).toBe(0.1);
		expect(loaded.minCapHeightMm).toBe(1.8);
		expect(loaded.plates.map((entry) => [entry.sourceId, entry.label])).toEqual([
			['Body3', 'A'],
			['Body8', 'B']
		]);
		expect(loaded.plates.every((entry) => (entry.bedFaceOutline[0]?.length ?? 0) > 2)).toBe(true);
	});

	it('rejects a spec that cannot place lettering', () => {
		expect(() => loadPlates(null)).toThrow('plates.json must be an object');
		expect(() => loadPlates({ plates: [] })).toThrow('plates.json is missing plates');
		expect(() => loadPlates(spec({ bedFaceZ: Number.POSITIVE_INFINITY }))).toThrow(
			'plates.json bedFaceZ must be a finite number'
		);
		expect(() => loadPlates(spec({}, { label: '' }))).toThrow('plates[0] label must be a string');
		expect(() => loadPlates(spec({}, { bedFaceOutline: 'square' }))).toThrow(
			'plates[0] bedFaceOutline must be an array'
		);
		expect(() => loadPlates(spec({}, { bedFaceOutline: [[[1]]] }))).toThrow(
			'plates[0] outline 0.0 must be a point'
		);
	});
});
