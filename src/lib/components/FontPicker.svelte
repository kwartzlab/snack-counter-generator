<script lang="ts">
	import type { FontOption } from '#lib/fonts';

	interface Props {
		fonts: readonly FontOption[];
		value: string;
		onchange: (id: string) => void;
	}

	let { fonts, value, onchange }: Props = $props();
</script>

<div class="field">
	<label for="font">Lettering</label>
	<select id="font" {value} onchange={(event) => onchange(event.currentTarget.value)}>
		{#each fonts as font (font.id)}
			<option value={font.id}>{font.label}</option>
		{/each}
	</select>
</div>

<style>
	.field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	label {
		font: 700 13px/1.2 var(--f-display);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--ink);
	}

	select {
		width: 100%;
		font: 400 17px/1.25 var(--f-body);
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0;
		padding: 10px 12px;
	}
</style>
