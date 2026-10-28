// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { FONTS } from '#lib/fonts';
import { mount, unmount } from 'svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

let baseFetches = 0;
let holdBase: Promise<void> | null = null;
let releaseBase: () => void = () => {};

function fileResponse(path: string): Response {
	return new Response(new Uint8Array(readFileSync(path)));
}

beforeAll(() => {
	const base = document.createElement('base');
	base.href = 'https://files.test/counter/';
	document.head.append(base);
	if (typeof URL.createObjectURL !== 'function') {
		URL.createObjectURL = () => 'blob:snack-counter-test';
		URL.revokeObjectURL = () => {};
	}
	vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.includes('counter-base.3mf')) {
			baseFetches += 1;
			if (holdBase) await holdBase;
			return fileResponse('static/counter-base.3mf');
		}
		const match = FONTS.find((font) => url.includes(font.file.split('/').at(-1) ?? font.file));
		if (!match) return new Response('missing', { status: 404 });
		return fileResponse(`static/${match.file}`);
	});
});

let page: ReturnType<typeof mount> | null = null;

async function renderPage(): Promise<void> {
	const target = document.createElement('div');
	document.body.append(target);
	page = mount(Page, { target });
	await vi.waitFor(() => {
		const button = document.querySelector('button.go');
		expect(button).toBeInstanceOf(HTMLButtonElement);
		expect((button as HTMLButtonElement).disabled).toBe(false);
	});
}

function field(id: string): HTMLInputElement {
	const input = document.querySelector(`#${id}`);
	if (!(input instanceof HTMLInputElement)) throw new Error(`missing #${id}`);
	return input;
}

function setField(id: string, value: string): void {
	const input = field(id);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

function status(): string {
	return document.querySelector('.status')?.textContent ?? '';
}

afterEach(() => {
	releaseBase();
	holdBase = null;
	if (page) unmount(page);
	page = null;
	document.body.replaceChildren();
});

describe('snack counter page', () => {
	it('loads the default lettering onto both front plates', async () => {
		await renderPage();
		expect(document.querySelector('h1')?.textContent).toBe('Snack Budget Counter');
		expect(field('name').value).toBe('YOUR NAME');
		expect(field('tagline').value).toBe('SNACK COUNTER');
		expect(document.querySelectorAll('canvas')).toHaveLength(2);
		expect(document.body.textContent).toContain('Front plate A · bed side');
		expect(document.body.textContent).toContain('Front plate B · bed side');

		const chips = [...document.querySelectorAll('.chip')].map((chip) => chip.textContent ?? '');
		expect(chips).toHaveLength(4);
		expect(chips.every((chip) => /fits|shrunk|too small/.test(chip))).toBe(true);

		const font = document.querySelector('#font');
		if (!(font instanceof HTMLSelectElement)) throw new Error('font select did not render');
		expect([...font.options].map((option) => option.value)).toEqual(FONTS.map((entry) => entry.id));
	});

	it('refits after the name changes and warns when the plate would be blank', async () => {
		await renderPage();
		setField('name', 'W'.repeat(40));
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain('too small');
		});

		setField('name', '   ');
		setField('tagline', '');
		await vi.waitFor(() => {
			expect(document.querySelector('.chip')?.textContent).toBe('No text: plain plates');
		});
	});

	it('builds a 3MF, ignores a second click while that build is running, then builds an STL from the cached base', async () => {
		await renderPage();
		setField('name', 'Ada Lovelace');

		holdBase = new Promise((resolve) => {
			releaseBase = resolve;
		});
		baseFetches = 0;
		const form = document.querySelector('form');
		if (!(form instanceof HTMLFormElement)) throw new Error('form did not render');
		form.requestSubmit();
		form.requestSubmit();

		await vi.waitFor(() => {
			expect(status()).toBe('Building…');
		});
		const button = document.querySelector('button.go');
		expect(button).toBeInstanceOf(HTMLButtonElement);
		expect((button as HTMLButtonElement).disabled).toBe(true);
		expect(baseFetches).toBe(1);

		releaseBase();
		holdBase = null;
		await vi.waitFor(
			() => {
				expect(status()).toMatch(/^Saved Snack_Budget_Counter_Ada_Lovelace\.3mf \(\d+ KB\)$/);
			},
			{ timeout: 15000 }
		);
		expect(baseFetches).toBe(1);

		const format = document.querySelector('#format');
		if (!(format instanceof HTMLSelectElement)) throw new Error('format select did not render');
		format.value = 'stl';
		format.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => {
			expect(document.querySelector('button.go')?.textContent).toBe('Download STL');
		});
		form.requestSubmit();
		await vi.waitFor(
			() => {
				expect(status()).toMatch(/^Saved Snack_Budget_Counter_Ada_Lovelace\.stl \(\d+ KB\)$/);
			},
			{ timeout: 15000 }
		);
		expect(baseFetches).toBe(1);
	});
});
