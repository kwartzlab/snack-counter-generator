<script lang="ts">
	import type { BuiltLine } from '#lib/geometry/types';

	interface Props {
		lines: BuiltLine[];
		ready: boolean;
	}

	let { lines, ready }: Props = $props();
</script>

<div class="field">
	<span class="lbl">Fit check</span>
	<div class="fit">
		{#if ready && lines.length === 0}
			<span class="chip warn">No text: plain plates</span>
		{/if}
		{#each lines as line, index (index)}
			<span class="chip {line.level}">{line.message}</span>
		{/each}
	</div>
</div>

<style>
	.field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.lbl {
		font: 700 13px/1.2 var(--f-display);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--ink);
	}

	.fit {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		font: 400 13px/1 var(--f-body);
		padding: 6px 8px;
		border-radius: 999px;
		border: 1px solid currentColor;
		white-space: nowrap;
	}

	.ok {
		color: var(--ok);
	}

	.warn {
		color: var(--warn);
	}

	.bad {
		color: var(--bad);
	}
</style>
