import { TypeKind, Type } from './typeid';

interface ToStackSpec {
	wirePos: number;
	name: string;
	args: string;
	indent: string;
}

interface FromStackSpec {
	args: string;
	indent: string;
}

export interface WireType {
	wireCount: number;
	jsType: string;
	toStackAllocatesWithAlign?: number;
	toStack(spec: ToStackSpec): string;
	fromStack?(spec: FromStackSpec): string;
}

export function getWireType(type: Type): WireType {
	const child = type.child;

	function arg(spec: ToStackSpec, offset = 0) {
		return spec.args + ' + ' + (spec.wirePos + offset);
	}

	switch(type.kind) {
		case TypeKind.Void:
			return {
				wireCount: 0,
				jsType: 'void',
				toStack(spec: ToStackSpec) {
					return '';
				},
				fromStack(spec: FromStackSpec) {
					return '';
				}
			};
		case TypeKind.Bool:
			return {
				wireCount: 1,
				jsType: 'boolean',
				toStack(spec: ToStackSpec) {
					return '$mem.F64[' + arg(spec) + '] = +!!' + spec.name + ';';
				},
				fromStack(spec: FromStackSpec) {
					return 'const $ret: boolean = !!$mem.F64[' + spec.args + '];';
				}
			};
		case TypeKind.Int:
			if(type.flags & 1) {
				return {
					wireCount: 1,
					jsType: 'number',
					toStack(spec: ToStackSpec) {
						// TODO: Also handle u64
						return '$mem.I32[(' + arg(spec) + ') * 2] = ' + spec.name + ';';
					},
					fromStack(spec: FromStackSpec) {
						return 'const $ret: number = $mem.I32[' + spec.args + ' * 2];';
					}
				};
			} else {
				return {
					wireCount: 1,
					jsType: 'number',
					toStack(spec: ToStackSpec) {
						// TODO: Also handle u64
						return '$mem.F64[' + arg(spec) + '] = ' + spec.name + ' + $intMagic;';
					},
					fromStack(spec: FromStackSpec) {
						return 'const $ret: number = $mem.U32[' + spec.args + ' * 2];';
					}
				};
			}

		case TypeKind.Float: return {
			wireCount: 1,
			jsType: 'number',
			toStack(spec: ToStackSpec) {
				return '$mem.F64[' + arg(spec) + '] = ' + spec.name + ';';
			},
			fromStack(spec: FromStackSpec) {
				return 'const $ret: number = $mem.F64[' + spec.args + '];';
			}
		};

		case TypeKind.Slice:
			if(child!.kind == TypeKind.Int && child!.len == 8) return {
				wireCount: 2,
				jsType: 'Slice | string',
				toStackAllocatesWithAlign: 1,
				toStack(spec: ToStackSpec) {
					return (
						'if(typeof ' + spec.name + ' == "string") {\n' +
						spec.indent + '\tconst $len = $encoder.encodeInto(' + spec.name + ', $mem.U8.subarray($top * 8)).written;\n' +
						spec.indent + '\t$mem.F64[' + arg(spec) + '] = $top * 8 + $base;\n' +
						spec.indent + '\t$mem.F64[' + arg(spec, 1) + '] = $len + $intMagic;\n' +
						spec.indent + '\t$top += $len / 8;\n' +
						spec.indent + '} else ' + spec.name + '.toStack(' + arg(spec) + ');'
					);
				}
			};
			return {
				wireCount: 2,
				jsType: 'Slice',
				toStack(spec: ToStackSpec) {
					return spec.name + '.toStack(' + arg(spec) + ');';
				}
			};
	}

	throw new Error('Unknown type');
}
