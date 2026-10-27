<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { BuiltLine, PlatePlacement, Polygon } from '#lib/geometry/types';

	interface Props {
		plate: PlatePlacement;
		polygons: Polygon[];
		lines: BuiltLine[];
	}

	let { plate, polygons, lines }: Props = $props();

	const caption = $derived(
		lines.map((line) => `${line.kind} ${line.widthMm.toFixed(1)}×${line.capHeightMm.toFixed(1)} mm`).join(' · ')
	);

	const drawPlate: Attachment<HTMLCanvasElement> = $derived.by(() => {
		const outline = plate.bedFaceOutline;
		const shapes = polygons;
		const centerX = plate.centerX;
		const centerY = plate.centerY;

		return (element) => {
		const draw = (): void => {
			const cssWidth = element.clientWidth;
			if (cssWidth <= 0) return;
			const cssHeight = cssWidth * (620 / 1400);
			const dpr = window.devicePixelRatio || 1;
			element.width = Math.max(1, Math.round(cssWidth * dpr));
			element.height = Math.max(1, Math.round(cssHeight * dpr));
			const context = element.getContext('2d');
			if (!context) return;
			context.setTransform(dpr, 0, 0, dpr, 0, 0);

			const style = getComputedStyle(document.documentElement);
			const plateFill = style.getPropertyValue('--plate').trim();
			const plateEdge = style.getPropertyValue('--plate-edge').trim();
			const accent = style.getPropertyValue('--accent').trim();

			let x0 = Infinity;
			let x1 = -Infinity;
			let y0 = Infinity;
			let y1 = -Infinity;
			for (const ring of outline) {
				for (const [x, y] of ring) {
					x0 = Math.min(x0, x);
					x1 = Math.max(x1, x);
					y0 = Math.min(y0, y);
					y1 = Math.max(y1, y);
				}
			}
			const pad = 24;
			const scale = Math.min((cssWidth - pad * 2) / (x1 - x0), (cssHeight - pad * 2) / (y1 - y0));
			const originX = cssWidth / 2 - ((x0 + x1) / 2) * scale;
			const originY = cssHeight / 2 + ((y0 + y1) / 2) * scale;
			const project = (x: number, y: number): [number, number] => [originX + x * scale, originY - y * scale];

			context.clearRect(0, 0, cssWidth, cssHeight);
			context.beginPath();
			for (const ring of outline) {
				ring.forEach(([x, y], index) => {
					const [px, py] = project(x, y);
					if (index === 0) context.moveTo(px, py);
					else context.lineTo(px, py);
				});
				context.closePath();
			}
			context.fillStyle = plateFill;
			context.fill('evenodd');
			context.lineWidth = 2;
			context.strokeStyle = plateEdge;
			context.stroke();

			context.beginPath();
			for (const polygon of shapes) {
				for (const ring of [polygon.outer, ...polygon.holes]) {
					ring.forEach(([x, y], index) => {
						const [px, py] = project(-(x - centerX), y - centerY);
						if (index === 0) context.moveTo(px, py);
						else context.lineTo(px, py);
					});
					context.closePath();
				}
			}
			context.fillStyle = accent;
			context.fill('evenodd');
		};

		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(element);
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		media.addEventListener('change', draw);
		return () => {
			observer.disconnect();
			media.removeEventListener('change', draw);
		};
		};
	});
</script>

<figure class="plate">
	<canvas {@attach drawPlate} aria-label="Front plate {plate.label}, bed side, with your lettering"></canvas>
	<figcaption>
		<span>Front plate {plate.label} · bed side</span>
		<span>{caption}</span>
	</figcaption>
</figure>

<style>
	.plate {
		margin: 0;
		background: var(--surface);
		border: 0;
		padding: 14px 14px 10px;
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	canvas {
		width: 100%;
		aspect-ratio: 1400 / 620;
		display: block;
	}

	figcaption {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		font: 400 13px/1.3 var(--f-body);
		color: var(--muted);
	}
</style>
