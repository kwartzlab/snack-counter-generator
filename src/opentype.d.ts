declare module 'opentype.js' {
	export interface PathCommand {
		type: string;
		x?: number;
		y?: number;
		x1?: number;
		y1?: number;
		x2?: number;
		y2?: number;
	}

	export interface FontPath {
		commands: PathCommand[];
	}

	export interface Glyph {
		advanceWidth?: number;
		getPath(
			x: number,
			y: number,
			fontSize: number,
			options?: { drawLayers?: boolean; drawSVG?: boolean },
			font?: Font
		): FontPath;
	}

	export interface Font {
		unitsPerEm: number;
		tables: {
			os2?: {
				sCapHeight?: number;
			};
		};
		charToGlyph(character: string): Glyph;
		getKerningValue(left: Glyph, right: Glyph): number;
		getPath(
			text: string,
			x: number,
			y: number,
			fontSize: number,
			options?: { kerning?: boolean; drawLayers?: boolean; drawSVG?: boolean }
		): FontPath;
	}

	export function parse(buffer: ArrayBuffer | ArrayBufferView): Font;
}
