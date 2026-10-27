// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { staticUrl } from './static-url';

describe('staticUrl', () => {
	it('strips a leading slash and keeps the file under the site base', () => {
		const base = document.createElement('base');
		base.href = 'https://files.test/counter/';
		document.head.append(base);

		const fromRelative = staticUrl('fonts/BebasNeue-Regular.ttf');
		const fromRoot = staticUrl('/fonts/BebasNeue-Regular.ttf');
		expect(fromRoot).toBe(fromRelative);
		expect(fromRelative.endsWith('fonts/BebasNeue-Regular.ttf')).toBe(true);
	});
});
