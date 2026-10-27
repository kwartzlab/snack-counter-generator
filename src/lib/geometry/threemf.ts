import { strToU8, unzipSync, zipSync } from 'fflate';
import type { Mesh } from './types';

const MODEL_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';

export interface ModelObject {
	id: string;
	name: string;
	sourceId: string | null;
	mesh: Mesh | null;
	components: { objectId: string }[];
}

export interface Parsed3mf {
	unit: string;
	title: string | null;
	objects: ModelObject[];
	buildItemIds: string[];
}

function localName(element: Element): string {
	return (element.localName || element.tagName).replace(/^.*:/, '').toLowerCase();
}

function children(parent: ParentNode, name: string): Element[] {
	const found: Element[] = [];
	const elements = 'children' in parent ? parent.children : [];
	for (const node of elements) {
		if (localName(node) === name) found.push(node);
	}
	return found;
}

function attribute(element: Element, name: string): string {
	const value = element.getAttribute(name);
	if (value === null) throw new Error(`3MF element is missing ${name}`);
	return value;
}

function coordinate(value: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) throw new Error(`3MF coordinate is not a number`);
	return parsed;
}

function readMesh(objectElement: Element): Mesh | null {
	const mesh = children(objectElement, 'mesh')[0];
	if (!mesh) return null;
	const vertexParent = children(mesh, 'vertices')[0];
	const triangleParent = children(mesh, 'triangles')[0];
	const vertices = vertexParent ? children(vertexParent, 'vertex') : [];
	const triangles = triangleParent ? children(triangleParent, 'triangle') : [];
	const positions = new Float32Array(vertices.length * 3);
	vertices.forEach((vertex, index) => {
		positions[index * 3] = coordinate(attribute(vertex, 'x'));
		positions[index * 3 + 1] = coordinate(attribute(vertex, 'y'));
		positions[index * 3 + 2] = coordinate(attribute(vertex, 'z'));
	});
	const indices = new Uint32Array(triangles.length * 3);
	triangles.forEach((triangle, index) => {
		indices[index * 3] = Number(attribute(triangle, 'v1'));
		indices[index * 3 + 1] = Number(attribute(triangle, 'v2'));
		indices[index * 3 + 2] = Number(attribute(triangle, 'v3'));
	});
	return { positions, indices };
}

function readSourceId(objectElement: Element): string | null {
	for (const meta of children(objectElement, 'metadata')) {
		if (meta.getAttribute('name') === 'sourceId') return meta.textContent?.trim() || null;
	}
	return null;
}

function modelFile(files: Record<string, Uint8Array>): Uint8Array {
	const direct = files['3D/3dmodel.model'] ?? files['3d/3dmodel.model'];
	if (direct) return direct;
	const match = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('3dmodel.model'));
	if (!match) throw new Error('3MF is missing 3D/3dmodel.model');
	return match[1];
}

/** Parse a 3MF package. Requires DOMParser, which browsers provide. */
export function parse3mf(data: Uint8Array): Parsed3mf {
	const files = unzipSync(data);
	const xml = new TextDecoder().decode(modelFile(files));
	const document = new DOMParser().parseFromString(xml, 'application/xml');
	const root = document.documentElement;
	if (!root || localName(root) !== 'model') throw new Error('Could not parse the 3MF model');

	const resources = children(root, 'resources')[0];
	const objects = resources
		? children(resources, 'object').map((objectElement) => {
				const componentParent = children(objectElement, 'components')[0];
				return {
					id: attribute(objectElement, 'id'),
					name: objectElement.getAttribute('name') ?? '',
					sourceId: readSourceId(objectElement),
					mesh: readMesh(objectElement),
					components: componentParent
						? children(componentParent, 'component').map((component) => ({
								objectId: attribute(component, 'objectid')
							}))
						: []
				};
			})
		: [];

	const build = children(root, 'build')[0];
	const buildItemIds = build
		? children(build, 'item').map((item) => attribute(item, 'objectid'))
		: [];

	let title: string | null = null;
	for (const meta of children(root, 'metadata')) {
		if (meta.getAttribute('name') === 'Title') title = meta.textContent?.trim() || null;
	}

	return {
		unit: root.getAttribute('unit') ?? '',
		title,
		objects,
		buildItemIds
	};
}

function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		if (character === '&') return '&amp;';
		if (character === '<') return '&lt;';
		if (character === '>') return '&gt;';
		if (character === '"') return '&quot;';
		return '&apos;';
	});
}

function formatCoordinate(value: number): string {
	const rounded = Math.round(value * 10000) / 10000;
	if (Object.is(rounded, -0) || rounded === 0) return '0';
	return String(rounded);
}

function meshXml(id: number, name: string, mesh: Mesh): string {
	const parts = [`<object id="${id}" name="${escapeXml(name)}" type="model"><mesh><vertices>`];
	const { positions, indices } = mesh;
	for (let index = 0; index < positions.length; index += 3) {
		parts.push(
			`<vertex x="${formatCoordinate(positions[index] ?? 0)}" y="${formatCoordinate(positions[index + 1] ?? 0)}" z="${formatCoordinate(positions[index + 2] ?? 0)}"/>`
		);
	}
	parts.push('</vertices><triangles>');
	for (let index = 0; index < indices.length; index += 3) {
		parts.push(
			`<triangle v1="${indices[index] ?? 0}" v2="${indices[index + 1] ?? 0}" v3="${indices[index + 2] ?? 0}"/>`
		);
	}
	parts.push('</triangles></mesh></object>');
	return parts.join('');
}

function letteringFor(sourceId: string | null, lettering: ReadonlyMap<string, Mesh>): Mesh | null {
	if (!sourceId) return null;
	const mesh = lettering.get(sourceId);
	if (!mesh || mesh.indices.length === 0) return null;
	return mesh;
}

/**
 * Write a 3MF with every base part. Front plates that have lettering become
 * an assembly of the plate mesh plus a separate lettering mesh.
 */
export function build3mf(base: Parsed3mf, lettering: ReadonlyMap<string, Mesh>, title: string): Uint8Array {
	let nextId = 1;
	const objects: string[] = [];
	const items: number[] = [];
	const byId = new Map(base.objects.map((object) => [object.id, object]));

	for (const itemId of base.buildItemIds) {
		const object = byId.get(itemId);
		if (!object?.mesh) throw new Error(`Base object ${itemId} has no mesh`);
		const text = letteringFor(object.sourceId, lettering);
		if (text) {
			const plateId = nextId;
			nextId += 1;
			const textId = nextId;
			nextId += 1;
			const assemblyId = nextId;
			nextId += 1;
			objects.push(meshXml(plateId, object.name, object.mesh));
			objects.push(meshXml(textId, `${object.name} lettering`, text));
			objects.push(
				`<object id="${assemblyId}" name="${escapeXml(object.name)}" type="model"><components><component objectid="${plateId}"/><component objectid="${textId}"/></components></object>`
			);
			items.push(assemblyId);
		} else {
			const id = nextId;
			nextId += 1;
			objects.push(meshXml(id, object.name, object.mesh));
			items.push(id);
		}
	}

	const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="${MODEL_NS}">
<metadata name="Title">${escapeXml(title)}</metadata>
<metadata name="Application">Snack Budget Counter</metadata>
<resources>${objects.join('\n')}</resources>
<build>${items.map((id) => `<item objectid="${id}"/>`).join('')}</build>
</model>`;

	const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;

	const relationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;

	return zipSync(
		{
			'[Content_Types].xml': strToU8(contentTypes),
			'_rels/.rels': strToU8(relationships),
			'3D/3dmodel.model': strToU8(model)
		},
		{ level: 6 }
	);
}
