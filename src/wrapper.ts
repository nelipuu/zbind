import { WireTypes } from './wiretype';
import { Type } from './typeid';
import { Memory, decoder } from './index';

export interface MethodSpec {
	name?: string;
	num: number;
	argIds: Float64Array;
}

export function getMethods(mem: Memory, pos: number) {
	const methods: MethodSpec[] = [];
	const count = mem.F64[pos++];

	for(let num = 0; num < count; ++num) {
		const namePos = mem.F64[pos++];
		const arity = mem.F64[pos++];
		const argIds = mem.F64.subarray(pos, pos + arity);
		pos += arity;

		const namePosEnd = mem.F64[pos];
		methods.push({ name: decoder.decode(mem.U8.subarray(namePos, namePosEnd)), num, argIds });
	}

	return methods;
}

export function emitWrapper(wireTypes: WireTypes, spec: MethodSpec): string {
	const arity = spec.argIds.length - 1;
	const params: string[] = [];
	const prologue = ['', 'const $mem = $getMemory();', 'const $args = $top;'];
	const body: string[] = [''];
	const epilogue: string[] = [''];

	// NOTE: WIRE POS OFFSET
	let wirePos = 1;

	let allocatesWithAlign: number | undefined;

	for(let num = 1; num <= arity; ++num) {
		const name = '$' + num;
		const toStack = wireTypes.toStack(Type.get(spec.argIds[num]), { wirePos, name, indent: '\t\t' })!;
		const align = toStack.allocatesWithAlign;

		if(align) {
			if(allocatesWithAlign && allocatesWithAlign < align) {
				// Add padding so stack pointer is aligned for next argument type.
				const scale = 8 / align;
				body.push(scale == 1 ? '$top = ~~($top + ' + ((align - 1) / 8) + ');' : '$top = ~~(($top + ' + ((align - 1) / 8) + ') * ' + scale + ') / ' + scale + ';');
			}

			allocatesWithAlign = align;
		}

		params.push(name + ': ' + toStack.jsType);
		if(toStack) body.push(toStack.code);

		wirePos += toStack.wireCount;
	}

	if(allocatesWithAlign) {
		prologue.push('$top += ' + wirePos + ';');
		body.push('$mem.F64[$args] = $top + $intMagic;');
		epilogue.push('$top = $args;');
	} else {
		prologue.push('$mem.F64[$args] = $top + ' + wirePos + ' + $intMagic;');
	}

	body.push('$wrappers[' + spec.num + ']();');

	const fromStack = wireTypes.fromStack(Type.get(spec.argIds[0]));
	if(fromStack && fromStack.code) {
		epilogue.push(fromStack.code);
		epilogue.push('return $ret;');
	}

	return (
		'\tfunction ' + spec.name + '(' + params.join(', ') + '): ' + (fromStack ? fromStack.jsType : 'void') + ' {' +
		prologue.join('\n\t\t') +
		body.join('\n\t\t') +
		epilogue.join('\n\t\t') +
		'\n\t}\n'
	);
}
