import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { getMethods, emitWrapper } from './wrapper';
import { $Memory } from './prologue';

export function emitSource(mem: $Memory, pos: number, path: string) {
	const methods = getMethods(mem, pos);
	const exports = '{ $init' + methods.map((method) => ', ' + method.name).join('') + ' }';

	return readFileSync(
		resolvePath(__dirname, '../src/prologue.ts'),
		'utf-8'
	).replace(
		'"$PATH"',
		'decodeURI(new URL(' + JSON.stringify(path) + ', import.meta.url).pathname)'
	).replace(
		'./index',
		'zbind'
	).replace(
		'} // END',
		''
	).replace(
		/e(xport (const|function) \$(init))/g,
		'E$1'
	).replace(
		/export /g,
		''
	).replace(
		/Export/g,
		'export'
	) + '\n' + methods.map(
		(spec) => emitWrapper(spec)
	).join('\n') + '\n\treturn ' + exports + ';\n}\n\nexport const ' + exports + ' = $create();\n'
}
