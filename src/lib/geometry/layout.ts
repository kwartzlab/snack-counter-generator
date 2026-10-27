import type { Font, Glyph, PathCommand } from 'opentype.js';
import { flattenPath, groupContours } from './outline';
import type { FitLevel, LineLayout, Point } from './types';

const glyphOptions = { drawLayers: false, drawSVG: false };

// opentype.js rejects a ccmp lookup Bangers uses, so getPath throws on any word.
// Placing each glyph keeps kerning and matches getPath for the other fonts.

function commandsFor(font: Font, text: string): PathCommand[] {
	const fontSize = font.unitsPerEm;
	const commands: PathCommand[] = [];
	let cursor = 0;
	let previous: Glyph | null = null;
	for (const character of text) {
		const glyph = font.charToGlyph(character);
		if (previous) cursor += font.getKerningValue(previous, glyph);
		commands.push(...glyph.getPath(cursor, 0, fontSize, glyphOptions, font).commands);
		cursor += glyph.advanceWidth ?? 0;
		previous = glyph;
	}
	return commands;
}

function capUnits(font: Font): number {
	const cap = font.tables.os2?.sCapHeight;
	if (cap && cap > 0) return cap;
	return font.unitsPerEm * 0.7;
}

export function layoutLine(text: string, font: Font, capHeightMm: number): LineLayout {
	const units = capUnits(font);
	const scale = capHeightMm / units;
	const contours = flattenPath(commandsFor(font, text)).map((contour) =>
		contour.map(([x, y]) => [x * scale, y * scale] as Point)
	);

	if (contours.length === 0) {
		return { polygons: [], widthMm: 0, x0: 0, capHeightMm };
	}

	let x0 = Infinity;
	let x1 = -Infinity;
	for (const contour of contours) {
		for (const [x] of contour) {
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
		}
	}

	return {
		polygons: groupContours(contours),
		widthMm: x1 - x0,
		x0,
		capHeightMm
	};
}

export function fitLine(text: string, font: Font, capHeightMm: number, maxWidthMm: number): LineLayout {
	const laid = layoutLine(text, font, capHeightMm);
	if (laid.widthMm > maxWidthMm && laid.widthMm > 0) {
		return layoutLine(text, font, (capHeightMm * maxWidthMm) / laid.widthMm);
	}
	return laid;
}

export function classifyFit(
	capHeightMm: number,
	requestedCapHeightMm: number,
	minCapHeightMm: number
): FitLevel {
	if (capHeightMm < minCapHeightMm) return 'bad';
	if (capHeightMm < requestedCapHeightMm - 0.01) return 'warn';
	return 'ok';
}
