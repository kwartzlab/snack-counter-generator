// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fontOption, loadFont } from './fonts';

let fetches = 0;
let fail = false;

beforeAll(() => {
	const base = document.createElement('base');
	base.href = 'https://files.test/counter/';
	document.head.append(base);
	vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
		fetches += 1;
		if (fail) return new Response('missing', { status: 404 });
		const url = String(input);
		const file = url.includes('Anton')
			? 'static/fonts/Anton-Regular.ttf'
			: url.includes('Bangers')
				? 'static/fonts/Bangers-Regular.ttf'
				: 'static/fonts/BebasNeue-Regular.ttf';
		return new Response(new Uint8Array(readFileSync(file)));
	});
});

describe('fonts', () => {
	it('lists the three lettering faces', () => {
		expect(fontOption('bebas').label).toContain('Bebas Neue');
		expect(fontOption('anton').file).toBe('fonts/Anton-Regular.ttf');
		expect(fontOption('bangers').file).toBe('fonts/Bangers-Regular.ttf');
		expect(() => fontOption('comic-sans')).toThrow('Unknown font comic-sans');
	});

	it('loads a face, retries after a failure, and then caches it', async () => {
		fail = true;
		await expect(loadFont('anton')).rejects.toThrow('Could not load Anton (heavier)');
		expect(fetches).toBe(1);

		fail = false;
		const first = await loadFont('anton');
		const second = await loadFont('anton');
		expect(second).toBe(first);
		expect(first.unitsPerEm).toBeGreaterThan(0);
		expect(fetches).toBe(2);
	});
});
