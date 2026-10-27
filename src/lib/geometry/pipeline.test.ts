import { readFileSync } from 'node:fs';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { buildCounterLettering, buildPlateLettering } from './lettering';
import { meshHealth } from './manifold';
import { loadPlates } from '../plates';

function loadBebas(): Font {
	const bytes = readFileSync('static/fonts/BebasNeue-Regular.ttf');
	return parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function range(values: Float32Array, axis: 0 | 1 | 2): { min: number; max: number } {
	let min = Infinity;
	let max = -Infinity;
	for (let index = axis; index < values.length; index += 3) {
		const value = values[index] ?? 0;
		min = Math.min(min, value);
		max = Math.max(max, value);
	}
	return { min, max };
}

describe('lettering pipeline', () => {
	const spec = loadPlates();
	const plate = spec.plates.find((entry) => entry.label === 'A');
	if (!plate) throw new Error('plate A is missing');
	const font = loadBebas();

	it('builds watertight RYAN DRAGA lettering on the name band', () => {
		const built = buildPlateLettering(font, plate, spec, {
			name: 'RYAN DRAGA',
			tagline: '',
			allCaps: true
		});
		const health = meshHealth(built.mesh);
		expect(health.manifold).toBe(true);
		expect(health.volume).toBeGreaterThan(0);

		const y = range(built.mesh.positions, 1);
		expect(y.min).toBeGreaterThanOrEqual(plate.nameBandY - 1.5);
		expect(y.max).toBeLessThanOrEqual(plate.nameBandY + 1.5);

		const z = range(built.mesh.positions, 2);
		expect(z.min).toBeCloseTo(-2.8, 4);
		expect(z.max).toBeCloseTo(-1.9, 4);
	});

	it('mirrors L so the stem sits on the +X side of the plate centre', () => {
		const built = buildPlateLettering(font, plate, spec, {
			name: 'L',
			tagline: '',
			allCaps: true
		});
		const y = range(built.mesh.positions, 1);
		const mid = (y.min + y.max) / 2;
		let sum = 0;
		let count = 0;
		for (let index = 0; index < built.mesh.positions.length; index += 3) {
			const x = built.mesh.positions[index] ?? 0;
			const pointY = built.mesh.positions[index + 1] ?? 0;
			if (pointY > mid) {
				sum += x;
				count += 1;
			}
		}
		expect(count).toBeGreaterThan(0);
		expect(sum / count).toBeGreaterThan(plate.centerX);
	});

	it('shrinks a 40-character name to the plate width and flags it as too small', () => {
		const built = buildPlateLettering(font, plate, spec, {
			name: 'W'.repeat(40),
			tagline: '',
			allCaps: true
		});
		const line = built.lines.find((entry) => entry.kind === 'name');
		expect(line).toBeDefined();
		if (!line) return;
		expect(line.widthMm).toBeCloseTo(plate.maxWidthMm, 1);
		expect(line.capHeightMm).toBeLessThan(spec.minCapHeightMm);
		expect(line.level).toBe('bad');
		expect(line.message).toContain('too small');
	});

	it('lays out Bangers, whose ccmp lookup opentype.js cannot read', () => {
		const bytes = readFileSync('static/fonts/Bangers-Regular.ttf');
		const bangers = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
		const built = buildPlateLettering(bangers, plate, spec, {
			name: 'RYAN DRAGA',
			tagline: 'SNACK SHAMER 9000',
			allCaps: true
		});
		const health = meshHealth(built.mesh);
		expect(health.manifold).toBe(true);
		expect(health.volume).toBeGreaterThan(0);
		expect(built.lines.every((line) => line.level === 'ok')).toBe(true);
	});

	it('returns empty plates when the name and tagline are blank', () => {
		const built = buildCounterLettering(font, spec, { name: '   ', tagline: '', allCaps: true });
		expect(built).toHaveLength(spec.plates.length);
		for (const entry of built) {
			expect(entry.lines).toEqual([]);
			expect(entry.polygons).toEqual([]);
			expect(entry.mesh.indices.length).toBe(0);
		}
	});

	it('uppercases a name when all caps is on', () => {
		const bytes = readFileSync('static/fonts/Anton-Regular.ttf');
		const anton = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
		const upper = buildPlateLettering(anton, plate, spec, { name: 'ryan', tagline: '', allCaps: true });
		const lower = buildPlateLettering(anton, plate, spec, { name: 'ryan', tagline: '', allCaps: false });
		const upperWidth = upper.lines.find((line) => line.kind === 'name')?.widthMm ?? 0;
		const lowerWidth = lower.lines.find((line) => line.kind === 'name')?.widthMm ?? 0;
		expect(Math.abs(upperWidth - lowerWidth)).toBeGreaterThan(0.05);
	});
});
