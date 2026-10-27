// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extrude } from './extrude';
import { build3mf, parse3mf } from './threemf';

describe('threemf', () => {
	it('round-trips the base and turns the front plates into assemblies', () => {
		const base = parse3mf(new Uint8Array(readFileSync('static/counter-base.3mf')));
		expect(base.buildItemIds).toHaveLength(8);
		expect(base.objects.map((object) => object.sourceId).sort()).toEqual([
			'Body1',
			'Body2',
			'Body3',
			'Body4',
			'Body5',
			'Body6',
			'Body7',
			'Body8'
		]);

		const lettering = extrude(
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
			-2.8,
			-1.9
		);
		const bytes = build3mf(
			base,
			new Map([
				['Body3', lettering],
				['Body8', lettering]
			]),
			'Snack Budget Counter: RYAN DRAGA'
		);
		const parsed = parse3mf(bytes);
		expect(parsed.unit).toBe('millimeter');
		expect(parsed.title).toBe('Snack Budget Counter: RYAN DRAGA');
		expect(parsed.buildItemIds).toHaveLength(8);

		const byId = new Map(parsed.objects.map((object) => [object.id, object]));
		const buildObjects = parsed.buildItemIds.map((id) => byId.get(id));
		const assemblies = buildObjects.filter((object) => object && object.components.length > 0);
		expect(assemblies).toHaveLength(2);
		expect(assemblies.map((object) => object?.name).sort()).toEqual(['Front plate A', 'Front plate B']);
		for (const assembly of assemblies) {
			expect(assembly?.components).toHaveLength(2);
			for (const component of assembly?.components ?? []) {
				expect(byId.get(component.objectId)?.mesh?.indices.length).toBeGreaterThan(0);
			}
		}
	});
});
