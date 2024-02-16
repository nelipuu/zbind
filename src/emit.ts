import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { WireTypes, codePath } from './wiretype';
import { getMethods, emitWrapper } from './wrapper';
import { Memory } from './index';

export function emitSource(mem: Memory, pos: number, path: string) {
	const methods = getMethods(mem, pos);
	const exports = '{ $init' + methods.map((method) => ', ' + method.name).join('') + ' }';
	const wireTypes = new WireTypes(readFileSync(codePath, 'utf-8').split('\n'));

	return readFileSync(
		resolvePath(__dirname, '../src/prologue.ts'),
		'utf-8'
	).replace(
		/(^|\n)(\} *)?\/\/[^\n]*\n/g,
		''
	).replace(
		'"$PATH"',
		'decodeURI(new URL(' + JSON.stringify(path) + ', import.meta.url).pathname)'
	).replace(
		'./index',
		'zbind'
	) + '\n' + methods.map(
		(spec) => emitWrapper(wireTypes, spec)
	).join('\n') + '\n\treturn ' + exports + ';\n}\n\nexport const ' + exports + ' = $create();\n'
}
