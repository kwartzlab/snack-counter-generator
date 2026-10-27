import { describe, expect, it } from 'vitest';
import { classifyFit } from './layout';

describe('classifyFit', () => {
	it('marks a line that keeps its requested height as ok', () => {
		expect(classifyFit(2.6, 2.6, 1.8)).toBe('ok');
		// 0.005 mm under the request stays inside the 0.01 mm tolerance.
		expect(classifyFit(2.595, 2.6, 1.8)).toBe('ok');
	});

	it('warns when the line had to shrink but is still printable', () => {
		expect(classifyFit(2.5, 2.6, 1.8)).toBe('warn');
	});

	it('flags a line below the minimum cap height', () => {
		expect(classifyFit(1.79, 2.6, 1.8)).toBe('bad');
	});
});
