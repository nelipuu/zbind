import { getWireType } from './wiretype';
import { Type } from './typeid';
import { $Memory, $decoder } from './prologue';

export interface MethodSpec {
	name?: string;
	num: number;
	argIds: Float64Array;
}

export function getMethods(mem: $Memory, pos: number) {
	const methods: MethodSpec[] = [];
	const count = mem.F64[pos++];

	for(let num = 0; num < count; ++num) {
		const namePos = mem.F64[pos++];
		const arity = mem.F64[pos++];
		const argIds = mem.F64.subarray(pos, pos + arity);
		pos += arity;

		const namePosEnd = mem.F64[pos];
		methods.push({ name: $decoder.decode(mem.U8.subarray(namePos, namePosEnd)), num, argIds });
	}

	return methods;
}

export function emitWrapper(spec: MethodSpec): string {
	const arity = spec.argIds.length - 1;
	const params: string[] = [];
	const prologue = ['', 'const $mem = $getMemory();', 'const $args = $top;'];
	const body: string[] = [''];
	const epilogue: string[] = [''];

	let id = spec.argIds[0];
	let type = Type.get(id)
	// NOTE: WIRE POS OFFSET
	let wirePos = 1;

	const retWire = getWireType(type);
	let allocatesWithAlign: number | undefined;

	for(let num = 1; num <= arity; ++num) {
		id = spec.argIds[num];
		type = Type.get(id)
		const name = '$' + num;
		const argSpec = getWireType(type);
		const align = argSpec.toStackAllocatesWithAlign;

		if(align) {
			if(allocatesWithAlign && allocatesWithAlign < align) {
				// Add padding so stack pointer is aligned for next argument type.
				const scale = 8 / align;
				body.push(scale == 1 ? '$top = ~~($top + ' + ((align - 1) / 8) + ');' : '$top = ~~(($top + ' + ((align - 1) / 8) + ') * ' + scale + ') / ' + scale + ';');
			}

			allocatesWithAlign = align;
		}

		params.push(name + ': ' + argSpec.jsType);

		const toStack = argSpec.toStack({ wirePos, name, args: '$args', indent: '\t' });
		if(toStack) body.push(toStack);

		wirePos += argSpec.wireCount;
	}

	if(allocatesWithAlign) {
		prologue.push('$top += ' + wirePos + ';');
		body.push('$mem.F64[$args] = $top + $intMagic;');
		epilogue.push('$top = $args;');
	} else {
		prologue.push('$mem.F64[$args] = $top + ' + wirePos + ' + $intMagic;');
	}

	body.push('$wrappers[' + spec.num + ']();');

	const fromStack = retWire.fromStack && retWire.fromStack({ args: '$args', indent: '\t' });
	if(fromStack) {
		epilogue.push(fromStack);
		epilogue.push('return $ret;');
	}

	return (
		'\tfunction ' + spec.name + '(' + params.join(', ') + '): ' + retWire.jsType + ' {' +
		prologue.join('\n\t\t') +
		body.join('\n\t\t') +
		epilogue.join('\n\t\t') +
		'\n\t}\n'
	);
}
