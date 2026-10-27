<script lang="ts">
	import type { DownloadFormat } from '#lib/filename';

	interface Props {
		format: DownloadFormat;
		busy: boolean;
		disabled: boolean;
		status: string;
		onFormat: (format: DownloadFormat) => void;
	}

	let { format, busy, disabled, status, onFormat }: Props = $props();

	const labels: Record<DownloadFormat, string> = {
		'3mf': 'Download 3MF',
		stl: 'Download STL'
	};

	function choose(value: string): void {
		if (value === '3mf' || value === 'stl') onFormat(value);
	}
</script>

<div class="download">
	<div class="field">
		<label for="format">File</label>
		<select id="format" value={format} onchange={(event) => choose(event.currentTarget.value)}>
			<option value="3mf">3MF, separate parts</option>
			<option value="stl">STL, one mesh</option>
		</select>
	</div>
	<button class="go" type="submit" disabled={disabled || busy}>{labels[format]}</button>
	<p class="status" role="status">{status}</p>
</div>

<style>
	.download {
		display: contents;
	}

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

	.go {
		font: 400 19px/1 var(--f-display);
		color: var(--accent-ink);
		background: var(--accent);
		border: 0;
		border-radius: 300px;
		padding: 14px 28px;
		cursor: pointer;
	}

	.go:hover {
		filter: brightness(1.06);
	}

	.go:active {
		transform: translateY(1px);
	}

	.go:disabled {
		opacity: 0.5;
		cursor: progress;
	}

	.status {
		margin: 0;
		min-height: 1.4em;
		font: 400 14px/1.3 var(--f-body);
		color: var(--muted);
		overflow-wrap: anywhere;
	}
</style>
