<script lang="ts">
	interface Props {
		name: string;
		tagline: string;
		allCaps: boolean;
		onName: (value: string) => void;
		onTagline: (value: string) => void;
	}

	let { name, tagline, allCaps = $bindable(), onName, onTagline }: Props = $props();
</script>

<div class="fields">
	<div class="field">
		<label for="name">Name</label>
		<input
			id="name"
			type="text"
			maxlength="40"
			spellcheck="false"
			autocomplete="off"
			value={name}
			oninput={(event) => onName(event.currentTarget.value)}
		/>
	</div>
	<div class="field">
		<label for="tagline">Tagline</label>
		<input
			id="tagline"
			type="text"
			maxlength="40"
			spellcheck="false"
			autocomplete="off"
			value={tagline}
			oninput={(event) => onTagline(event.currentTarget.value)}
		/>
	</div>
	<label class="check">
		<input type="checkbox" bind:checked={allCaps} />
		All caps
	</label>
</div>

<style>
	.fields {
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

	input[type='text'] {
		width: 100%;
		font: 400 17px/1.25 var(--f-body);
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0;
		padding: 10px 12px;
	}

	.check {
		display: flex;
		gap: 10px;
		align-items: center;
		font: 400 17px/1.25 var(--f-body);
		letter-spacing: 0;
		text-transform: none;
		color: var(--ink);
	}

	.check input {
		width: 18px;
		height: 18px;
		accent-color: var(--accent);
	}
</style>
