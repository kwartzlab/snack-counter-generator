import { parse3mf, type Parsed3mf } from './geometry/threemf';
import { staticUrl } from './static-url';

let pending: Promise<Parsed3mf> | null = null;

export function loadBaseModel(): Promise<Parsed3mf> {
	if (pending) return pending;
	pending = fetch(staticUrl('counter-base.3mf'))
		.then((response) => {
			if (!response.ok) throw new Error('Could not load the counter base');
			return response.arrayBuffer();
		})
		.then((buffer) => parse3mf(new Uint8Array(buffer)))
		.catch((error: unknown) => {
			pending = null;
			throw error;
		});
	return pending;
}
