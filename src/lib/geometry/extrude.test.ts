import { describe, expect, it } from 'vitest';
import { extrude } from './extrude';
import { meshHealth } from './manifold';

describe('extrude', () => {
	it('closes a square with a square hole', () => {
		const mesh = extrude(
			[
				{
					outer: [
						[0, 0],
						[10, 0],
						[10, 10],
						[0, 10]
					],
					holes: [
						[
							[3, 3],
							[3, 7],
							[7, 7],
							[7, 3]
						]
					]
				}
			],
			0,
			1
		);
		const health = meshHealth(mesh);
		expect(health.manifold).toBe(true);
		expect(health.volume).toBeCloseTo(84, 3);
	});
});
