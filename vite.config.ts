import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const svelteClient = fileURLToPath(new URL('./node_modules/svelte/src/index-client.js', import.meta.url));

function basePath(): '' | `/${string}` {
	const raw = process.env.BASE_PATH?.trim() ?? '';
	if (raw === '' || raw === '/') return '';
	const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
	return withSlash.replace(/\/+$/, '') as `/${string}`;
}

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				strict: true
			}),
			paths: {
				base: basePath()
			}
		})
	],
	ssr: {
		noExternal: ['opentype.js']
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		// Vitest resolves the node build of Svelte, whose mount() refuses to run.
		// Component tests need the client build. The match is exact so svelte/internal/* stays put.
		alias: [{ find: /^svelte$/, replacement: svelteClient }]
	}
});
