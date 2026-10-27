// @vitest-environment happy-dom

import type { DownloadFormat } from '#lib/filename';
import type { BuiltLine } from '#lib/geometry/types';
import { loadPlates } from '#lib/plates';
import { mount, unmount, type Component } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DownloadButton from './DownloadButton.svelte';
import FitStatus from './FitStatus.svelte';
import FontPicker from './FontPicker.svelte';
import PlatePreview from './PlatePreview.svelte';
import TextFields from './TextFields.svelte';

const mounted: Array<() => void> = [];

function render<Props extends Record<string, unknown>>(component: Component<Props>, props: Props): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	const instance = mount(component, { target, props });
	mounted.push(() => unmount(instance));
	return target;
}

afterEach(() => {
	for (const destroy of mounted) destroy();
	mounted.length = 0;
	document.body.replaceChildren();
});

function line(level: BuiltLine['level'], message: string): BuiltLine {
	return { kind: 'name', widthMm: 20, capHeightMm: 2.4, level, message };
}

describe('form controls', () => {
	it('reports typed text and the all-caps checkbox', () => {
		const onName = vi.fn();
		const onTagline = vi.fn();
		const view = render(TextFields, {
			name: 'RYAN',
			tagline: 'SNACK',
			allCaps: true,
			onName,
			onTagline
		});

		const name = view.querySelector('#name');
		const tagline = view.querySelector('#tagline');
		const caps = view.querySelector('input[type="checkbox"]');
		if (!(name instanceof HTMLInputElement) || !(tagline instanceof HTMLInputElement)) {
			throw new Error('text fields did not render');
		}
		if (!(caps instanceof HTMLInputElement)) throw new Error('all-caps checkbox did not render');

		expect(name.maxLength).toBe(40);
		expect(name.value).toBe('RYAN');
		expect(caps.checked).toBe(true);

		name.value = 'Ada';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		tagline.value = 'Counter';
		tagline.dispatchEvent(new Event('input', { bubbles: true }));
		caps.click();

		expect(onName).toHaveBeenCalledWith('Ada');
		expect(onTagline).toHaveBeenCalledWith('Counter');
		expect(caps.checked).toBe(false);
	});

	it('lists the lettering faces and reports the selection', () => {
		const onchange = vi.fn();
		const view = render(FontPicker, {
			fonts: [
				{ id: 'bebas', label: 'Bebas Neue', file: 'fonts/BebasNeue-Regular.ttf' },
				{ id: 'anton', label: 'Anton', file: 'fonts/Anton-Regular.ttf' }
			],
			value: 'bebas',
			onchange
		});
		const select = view.querySelector('#font');
		if (!(select instanceof HTMLSelectElement)) throw new Error('font select did not render');
		expect([...select.options].map((option) => option.value)).toEqual(['bebas', 'anton']);

		select.value = 'anton';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onchange).toHaveBeenCalledWith('anton');
	});

	it('shows a fit chip for each line, and a plain-plate warning when there is no text', () => {
		const empty = render(FitStatus, { lines: [], ready: true });
		expect(empty.querySelector('.chip')?.textContent).toBe('No text: plain plates');
		expect(empty.querySelector('.chip')?.classList.contains('warn')).toBe(true);

		const pending = render(FitStatus, { lines: [], ready: false });
		expect(pending.querySelector('.chip')).toBeNull();

		const filled = render(FitStatus, {
			lines: [line('ok', 'A name: fits'), line('bad', 'A tagline: 1.2 mm, too small')],
			ready: true
		});
		const chips = [...filled.querySelectorAll('.chip')];
		expect(chips.map((chip) => chip.textContent)).toEqual(['A name: fits', 'A tagline: 1.2 mm, too small']);
		expect(chips[0]?.classList.contains('ok')).toBe(true);
		expect(chips[1]?.classList.contains('bad')).toBe(true);
	});

	it('switches the download label and refuses a click while busy or blocked', () => {
		const onFormat = vi.fn();
		const view = render(DownloadButton, {
			format: '3mf' as DownloadFormat,
			busy: false,
			disabled: false,
			status: '',
			onFormat
		});
		const button = view.querySelector('button.go');
		const select = view.querySelector('#format');
		if (!(button instanceof HTMLButtonElement) || !(select instanceof HTMLSelectElement)) {
			throw new Error('download controls did not render');
		}
		expect(button.textContent).toBe('Download 3MF');
		expect(button.disabled).toBe(false);

		select.value = 'stl';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onFormat).toHaveBeenCalledWith('stl');

		const blocked = render(DownloadButton, {
			format: 'stl' as DownloadFormat,
			busy: true,
			disabled: true,
			status: 'Building…',
			onFormat
		});
		const busyButton = blocked.querySelector('button.go');
		if (!(busyButton instanceof HTMLButtonElement)) throw new Error('busy button did not render');
		expect(busyButton.textContent).toBe('Download STL');
		expect(busyButton.disabled).toBe(true);
		expect(blocked.querySelector('.status')?.textContent).toBe('Building…');
	});
});

describe('plate preview', () => {
	it('labels the plate and the size of each line', () => {
		const plate = loadPlates().plates[0];
		if (!plate) throw new Error('plate A is missing');
		const lines: BuiltLine[] = [
			{ kind: 'name', widthMm: 12.34, capHeightMm: 2.6, level: 'ok', message: 'A name: fits' }
		];
		const view = render(PlatePreview, { plate, polygons: [], lines });
		expect(view.querySelector('canvas')?.getAttribute('aria-label')).toBe(
			'Front plate A, bed side, with your lettering'
		);
		expect(view.querySelector('figcaption')?.textContent).toContain('Front plate A · bed side');
		expect(view.querySelector('figcaption')?.textContent).toContain('name 12.3×2.6 mm');
	});
});
