export type Point = [number, number];
export type Ring = Array<Point>;

export interface Polygon {
	outer: Ring;
	holes: Array<Ring>;
}

export interface Mesh {
	positions: Float32Array;
	indices: Uint32Array;
}

export interface PlatePlacement {
	sourceId: string;
	label: string;
	name: string;
	maxWidthMm: number;
	capHeightMm: number;
	centerX: number;
	centerY: number;
	taglineBandY: number;
	nameBandY: number;
	bedFaceOutline: Point[][];
}

export interface LetteringSpec {
	bedFaceZ: number;
	textDepth: number;
	textOverlapIntoPlate: number;
	minCapHeightMm: number;
	plates: PlatePlacement[];
}

export type FitLevel = 'ok' | 'warn' | 'bad';

export type LineKind = 'name' | 'tagline';

export interface LineLayout {
	polygons: Polygon[];
	widthMm: number;
	x0: number;
	capHeightMm: number;
}

export interface BuiltLine {
	kind: LineKind;
	widthMm: number;
	capHeightMm: number;
	level: FitLevel;
	message: string;
}

export interface BuiltPlate {
	sourceId: string;
	label: string;
	lines: BuiltLine[];
	polygons: Polygon[];
	mesh: Mesh;
}
