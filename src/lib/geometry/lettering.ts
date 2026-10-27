import type { Font } from 'opentype.js';
import { extrude } from './extrude';
import { classifyFit, fitLine } from './layout';
import { placeLine } from './place';
import type { BuiltLine, BuiltPlate, FitLevel, LetteringSpec, LineKind, PlatePlacement } from './types';

export interface LetteringInput {
	name: string;
	tagline: string;
	allCaps: boolean;
}

function prepare(text: string, allCaps: boolean): string {
	return (allCaps ? text.toUpperCase() : text).trim();
}

function fitMessage(label: string, kind: LineKind, capHeightMm: number, level: FitLevel): string {
	if (level === 'bad') return `${label} ${kind}: ${capHeightMm.toFixed(1)} mm, too small`;
	if (level === 'warn') return `${label} ${kind}: shrunk to ${capHeightMm.toFixed(1)} mm`;
	return `${label} ${kind}: fits`;
}

export function buildPlateLettering(
	font: Font,
	plate: PlatePlacement,
	spec: Pick<LetteringSpec, 'bedFaceZ' | 'textDepth' | 'textOverlapIntoPlate' | 'minCapHeightMm'>,
	input: LetteringInput
): BuiltPlate {
	const lines: BuiltLine[] = [];
	const placed = [];
	const requests: { kind: LineKind; text: string; bandY: number }[] = [];
	const tagline = prepare(input.tagline, input.allCaps);
	const name = prepare(input.name, input.allCaps);
	if (tagline) requests.push({ kind: 'tagline', text: tagline, bandY: plate.taglineBandY });
	if (name) requests.push({ kind: 'name', text: name, bandY: plate.nameBandY });

	for (const request of requests) {
		const laid = fitLine(request.text, font, plate.capHeightMm, plate.maxWidthMm);
		const level = classifyFit(laid.capHeightMm, plate.capHeightMm, spec.minCapHeightMm);
		lines.push({
			kind: request.kind,
			widthMm: laid.widthMm,
			capHeightMm: laid.capHeightMm,
			level,
			message: fitMessage(plate.label, request.kind, laid.capHeightMm, level)
		});
		placed.push(...placeLine(laid, plate.centerX, request.bandY));
	}

	const z0 = spec.bedFaceZ - spec.textDepth;
	const z1 = spec.bedFaceZ + spec.textOverlapIntoPlate;
	return {
		sourceId: plate.sourceId,
		label: plate.label,
		lines,
		polygons: placed,
		mesh: extrude(placed, z0, z1)
	};
}

export function buildCounterLettering(
	font: Font,
	spec: LetteringSpec,
	input: LetteringInput
): BuiltPlate[] {
	return spec.plates.map((plate) => buildPlateLettering(font, plate, spec, input));
}
