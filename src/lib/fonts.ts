import { parse, type Font } from 'opentype.js';
import { staticUrl } from './static-url';

export interface FontOption {
	id: string;
	label: string;
	file: string;
}

export const FONTS: readonly FontOption[] = [
	{ id: 'bebas', label: 'Bebas Neue (the original)', file: 'fonts/BebasNeue-Regular.ttf' },
	{ id: 'anton', label: 'Anton (heavier)', file: 'fonts/Anton-Regular.ttf' },
	{ id: 'bangers', label: 'Bangers (comic)', file: 'fonts/Bangers-Regular.ttf' }
];

const cache = new Map<string, Promise<Font>>();

export function fontOption(id: string): FontOption {
	const match = FONTS.find((font) => font.id === id);
	if (!match) throw new Error(`Unknown font ${id}`);
	return match;
}

export function loadFont(id: string): Promise<Font> {
	const existing = cache.get(id);
	if (existing) return existing;
	const option = fontOption(id);
	const pending = fetch(staticUrl(option.file))
		.then((response) => {
			if (!response.ok) throw new Error(`Could not load ${option.label}`);
			return response.arrayBuffer();
		})
		.then((buffer) => parse(buffer))
		.catch((error: unknown) => {
			cache.delete(id);
			throw error;
		});
	cache.set(id, pending);
	return pending;
}
