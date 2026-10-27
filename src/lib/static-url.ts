export function staticUrl(path: string): string {
	const trimmed = path.replace(/^\/+/, '');
	const configured = import.meta.env.BASE_URL;
	if (configured && configured !== '/') return `${configured}${trimmed}`;
	return new URL(trimmed, document.baseURI).href;
}
