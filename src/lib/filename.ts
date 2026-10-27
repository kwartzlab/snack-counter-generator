export function slugifyName(name: string): string {
	const slug = name
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return slug.length > 0 ? slug : 'Custom';
}

export type DownloadFormat = '3mf' | 'stl';

export function downloadFilename(name: string, format: DownloadFormat): string {
	return `Snack_Budget_Counter_${slugifyName(name)}.${format}`;
}
