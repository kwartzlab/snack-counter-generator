import raw from './assets/plates.json';
import type { LetteringSpec, PlatePlacement, Point } from './geometry/types';

function record(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}
	return value as Record<string, unknown>;
}

function numberField(source: Record<string, unknown>, key: string, label: string): number {
	const value = source[key];
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${label} ${key} must be a finite number`);
	}
	return value;
}

function stringField(source: Record<string, unknown>, key: string, label: string): string {
	const value = source[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${label} ${key} must be a string`);
	}
	return value;
}

function outline(value: unknown, label: string): Point[][] {
	if (!Array.isArray(value)) throw new Error(`${label} bedFaceOutline must be an array`);
	return value.map((ring, ringIndex) => {
		if (!Array.isArray(ring)) throw new Error(`${label} outline ${ringIndex} must be an array`);
		return ring.map((point, pointIndex) => {
			if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
				throw new Error(`${label} outline ${ringIndex}.${pointIndex} must be a point`);
			}
			return [point[0], point[1]] as Point;
		});
	});
}

function plate(value: unknown, index: number): PlatePlacement {
	const source = record(value, `plates[${index}]`);
	const label = `plates[${index}]`;
	return {
		sourceId: stringField(source, 'sourceId', label),
		label: stringField(source, 'label', label),
		name: stringField(source, 'name', label),
		maxWidthMm: numberField(source, 'maxWidthMm', label),
		capHeightMm: numberField(source, 'capHeightMm', label),
		centerX: numberField(source, 'centerX', label),
		centerY: numberField(source, 'centerY', label),
		taglineBandY: numberField(source, 'taglineBandY', label),
		nameBandY: numberField(source, 'nameBandY', label),
		bedFaceOutline: outline(source.bedFaceOutline, label)
	};
}

export function loadPlates(source: unknown = raw): LetteringSpec {
	const data = record(source, 'plates.json');
	if (!Array.isArray(data.plates) || data.plates.length === 0) {
		throw new Error('plates.json is missing plates');
	}
	return {
		bedFaceZ: numberField(data, 'bedFaceZ', 'plates.json'),
		textDepth: numberField(data, 'textDepth', 'plates.json'),
		textOverlapIntoPlate: numberField(data, 'textOverlapIntoPlate', 'plates.json'),
		minCapHeightMm: numberField(data, 'minCapHeightMm', 'plates.json'),
		plates: data.plates.map((entry, index) => plate(entry, index))
	};
}
