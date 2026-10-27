<script lang="ts">
	import { loadBaseModel } from '#lib/base-model';
	import DownloadButton from '#lib/components/DownloadButton.svelte';
	import FitStatus from '#lib/components/FitStatus.svelte';
	import FontPicker from '#lib/components/FontPicker.svelte';
	import PlatePreview from '#lib/components/PlatePreview.svelte';
	import TextFields from '#lib/components/TextFields.svelte';
	import { downloadFilename, type DownloadFormat } from '#lib/filename';
	import { FONTS, loadFont } from '#lib/fonts';
	import { buildCounterLettering, type LetteringInput } from '#lib/geometry/lettering';
	import { buildStl, printableMeshes } from '#lib/geometry/stl';
	import { build3mf } from '#lib/geometry/threemf';
	import type { BuiltPlate } from '#lib/geometry/types';
	import { loadPlates } from '#lib/plates';
	import type { Font } from 'opentype.js';
	import { onMount } from 'svelte';

	const spec = loadPlates();

	let name = $state('RYAN DRAGA');
	let tagline = $state('SNACK SHAMER 9000');
	let allCaps = $state(true);
	let fontId = $state(FONTS[0]?.id ?? 'bebas');
	let debouncedName = $state('RYAN DRAGA');
	let debouncedTagline = $state('SNACK SHAMER 9000');
	let font = $state<Font | null>(null);
	let fontError = $state<string | null>(null);
	let format = $state<DownloadFormat>('3mf');
	let building = $state(false);
	let downloadStatus = $state('');
	let nameTimer: ReturnType<typeof setTimeout> | undefined;
	let taglineTimer: ReturnType<typeof setTimeout> | undefined;
	let fontRequest = 0;

	const preview = $derived.by(() => {
		const loaded = font;
		if (!loaded) return { plates: null as BuiltPlate[] | null, error: null as string | null };
		try {
			return {
				plates: buildCounterLettering(loaded, spec, {
					name: debouncedName,
					tagline: debouncedTagline,
					allCaps
				}),
				error: null
			};
		} catch (error: unknown) {
			return {
				plates: null,
				error:
					error instanceof Error ? `Couldn't lay out that text: ${error.message}` : 'Could not lay out that text'
			};
		}
	});

	const lines = $derived(preview.plates?.flatMap((plate) => plate.lines) ?? []);
	const status = $derived(fontError ?? preview.error ?? downloadStatus);

	function queueName(value: string): void {
		name = value;
		clearTimeout(nameTimer);
		nameTimer = setTimeout(() => {
			debouncedName = value;
		}, 60);
	}

	function queueTagline(value: string): void {
		tagline = value;
		clearTimeout(taglineTimer);
		taglineTimer = setTimeout(() => {
			debouncedTagline = value;
		}, 60);
	}

	async function refreshFont(id: string): Promise<void> {
		fontId = id;
		const request = ++fontRequest;
		try {
			const loaded = await loadFont(id);
			if (request !== fontRequest) return;
			font = loaded;
			fontError = null;
		} catch (error: unknown) {
			if (request !== fontRequest) return;
			font = null;
			fontError = error instanceof Error ? error.message : 'Could not load the font';
		}
	}

	onMount(() => {
		void refreshFont(fontId);
	});

	async function download(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const loaded = font;
		if (!loaded || building) return;
		building = true;
		downloadStatus = 'Building…';
		try {
			const input: LetteringInput = { name, tagline, allCaps };
			clearTimeout(nameTimer);
			clearTimeout(taglineTimer);
			debouncedName = name;
			debouncedTagline = tagline;
			const plates = buildCounterLettering(loaded, spec, input);
			const base = await loadBaseModel();
			const lettering = new Map(
				plates
					.filter((plate) => plate.mesh.indices.length > 0)
					.map((plate) => [plate.sourceId, plate.mesh] as const)
			);
			const titleName = input.name.trim() || 'Custom';
			const bytes =
				format === 'stl'
					? buildStl(printableMeshes(base, lettering))
					: build3mf(base, lettering, `Snack Budget Counter: ${titleName}`);
			const type = format === 'stl' ? 'model/stl' : 'model/3mf';
			const filename = downloadFilename(input.name, format);
			const file = new Uint8Array(bytes.byteLength);
			file.set(bytes);
			const blob = new Blob([file], { type });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = filename;
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 5000);
			downloadStatus = `Saved ${filename} (${(bytes.length / 1024).toFixed(0)} KB)`;
		} catch (error: unknown) {
			downloadStatus = error instanceof Error ? `Build failed: ${error.message}` : 'Build failed';
		} finally {
			building = false;
		}
	}
</script>

<svelte:head>
	<title>Snack Budget Counter</title>
</svelte:head>

<div class="wrap">
	<header>
		<a class="brand" href="https://kwartzlab.ca" aria-label="Kwartzlab Makerspace">
			<img src="./kwartzlab-logo.webp" alt="" width="220" height="88" />
		</a>
		<h1>Snack Budget Counter</h1>
		<p class="lede">
			Put your name on a clicky snack counter. Type it in, check the preview, and download a 3MF or an STL.
			The lettering is raised 0.8 mm and prints face-down on the bed.
		</p>
	</header>

	<section class="bench">
		<form class="controls" autocomplete="off" onsubmit={download}>
			<TextFields {name} {tagline} bind:allCaps onName={queueName} onTagline={queueTagline} />
			<FontPicker fonts={FONTS} value={fontId} onchange={(id) => void refreshFont(id)} />
			<FitStatus {lines} ready={preview.plates !== null} />
			<DownloadButton
				{format}
				busy={building}
				disabled={font === null || preview.error !== null}
				{status}
				onFormat={(next) => (format = next)}
			/>
		</form>

		<div class="preview">
			{#each spec.plates as plate (plate.sourceId)}
				{@const match = preview.plates?.find((entry) => entry.sourceId === plate.sourceId)}
				<PlatePreview {plate} polygons={match?.polygons ?? []} lines={match?.lines ?? []} />
			{/each}
		</div>
	</section>

	<section class="notes">
		<div>
			<h2>What's in the file</h2>
			<p>
				Same set as the original print: both dials, both springs, and front and back plates for variants A and
				B. 3MF keeps the lettering as its own part on each front plate. STL is one mesh of those same parts.
			</p>
		</div>
		<div>
			<h2>Two-colour lettering</h2>
			<p>
				Lettering occupies the first <code>0.8 mm</code>. With 0.2 mm layers, add a filament change at
				<code>0.8 mm</code> and the letters come out in the first colour. Print the front plates on their own if
				you do this.
			</p>
		</div>
		<div>
			<h2>Keep it legible</h2>
			<p>
				Long names shrink to fit the plate. Below about <code>1.8 mm</code> tall, letters get mushy on a 0.4 mm
				nozzle, so try a nickname or a shorter tagline.
			</p>
		</div>
	</section>
</div>

<style>
	.wrap {
		max-width: 1040px;
		margin: 0 auto;
		display: grid;
		gap: 28px;
		padding: 28px max(16px, env(safe-area-inset-left)) 48px max(16px, env(safe-area-inset-right));
	}

	header {
		display: grid;
		gap: 18px;
	}

	.brand {
		justify-self: start;
	}

	.brand img {
		display: block;
		width: min(220px, 70vw);
		height: auto;
	}

	@media (prefers-color-scheme: dark) {
		.brand img {
			filter: invert(1);
		}
	}

	h1 {
		margin: 0;
		max-width: 12ch;
		font: 700 clamp(40px, 7vw, 64px) / 0.9 var(--f-display);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		text-wrap: balance;
	}

	.lede {
		margin: 0;
		max-width: 62ch;
		color: var(--muted);
	}

	.bench {
		display: grid;
		grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
		gap: 24px;
		align-items: start;
	}

	.controls,
	.preview {
		min-width: 0;
	}

	.controls {
		background: var(--surface);
		padding: 20px;
		display: grid;
		gap: 18px;
	}

	.preview {
		display: grid;
		gap: 14px;
	}

	.notes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
		gap: 18px;
		border-top: 1px solid var(--line);
		padding-top: 20px;
	}

	.notes h2 {
		margin: 0 0 6px;
		color: var(--accent);
		font: 700 22px/1 var(--f-display);
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.notes p {
		margin: 0;
		color: var(--muted);
		font-size: 15px;
	}

	.notes code {
		font: 700 0.95em var(--f-display);
		letter-spacing: 0.02em;
	}

	@media (max-width: 760px) {
		.bench {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
