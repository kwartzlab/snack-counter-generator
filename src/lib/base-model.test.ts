// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadBaseModel } from './base-model';

let fetches = 0;
let fail = false;

beforeAll(() => {
	const base = document.createElement('base');
	base.href = 'https://files.test/counter/';
	document.head.append(base);
	vi.stubGlobal('fetch', async () => {
		fetches += 1;
		if (fail) return new Response('missing', { status: 500 });
		return new Response(new Uint8Array(readFileSync('static/counter-base.3mf')));
	});
});

describe('loadBaseModel', () => {
	it('parses the counter once and retries after a failed fetch', async () => {
		fail = true;
		await expect(loadBaseModel()).rejects.toThrow('Could not load the counter base');
		expect(fetches).toBe(1);

		fail = false;
		const first = await loadBaseModel();
		const second = await loadBaseModel();
		expect(second).toBe(first);
		expect(first.unit).toBe('millimeter');
		expect(first.buildItemIds).toHaveLength(8);
		expect(fetches).toBe(2);
	});
});
