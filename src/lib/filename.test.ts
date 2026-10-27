import { describe, expect, it } from 'vitest';
import { downloadFilename, slugifyName } from './filename';

describe('download filenames', () => {
	it('turns a name into a safe file stem', () => {
		expect(slugifyName('RYAN DRAGA')).toBe('RYAN_DRAGA');
		expect(slugifyName('  café!! ')).toBe('cafe');
		expect(slugifyName('A/B')).toBe('A_B');
		expect(slugifyName('___')).toBe('Custom');
		expect(slugifyName('   ')).toBe('Custom');
	});

	it('appends the chosen format', () => {
		expect(downloadFilename('RYAN DRAGA', '3mf')).toBe('Snack_Budget_Counter_RYAN_DRAGA.3mf');
		expect(downloadFilename('Ada Lovelace', 'stl')).toBe('Snack_Budget_Counter_Ada_Lovelace.stl');
		expect(downloadFilename('', '3mf')).toBe('Snack_Budget_Counter_Custom.3mf');
	});
});
