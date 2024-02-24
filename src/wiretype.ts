import { resolve as resolvePath } from 'path';

import { TypeKind, Type } from './typeid';
import { Snippet, readSnippets } from './snippets';
import {
	decoder as $decoder,
	encoder as $encoder,
	Memory,
	Slice as $Slice,
	OpaqueStruct as $OpaqueStruct
} from './index';

export interface WireType {
	id: string;
	include?: Record<string, boolean>;
	replace?: Record<string, string>;
	replaceTo?: Record<string, string>;
	replaceFrom?: Record<string, string>;
	toStackType?: string;
	fromStackType?: string;
	toStackAllocatesWithAlign?: number;
	toStack?($1: unknown): void;
	fromStack?(): void;
}

export const codePath = resolvePath(__dirname, '../src/wiretype.ts');

interface ToStackSpec {
	wirePos: number;
	name: string;
	indent: string;
}

interface FromStackSpec {
	indent: string;
}

// Variables declared only to benefit from typings while editing this file. Code referencing them never runs.
declare const $mem: Memory;
declare const $F64: Float64Array;
declare const $args: number;
declare const $intMagic: number;
declare const $getMemory: () => Memory;
declare const $slots: CallableFunction[];
declare let $slot: number;
declare let $top: number;

function transform(code: string, include?: Record<string, boolean>, replace?: Record<string, string>) {
	if(include) {
		const re = new RegExp('//[ \t]*if:(' + Object.keys(include).join('|') + ')');
		const lines: string[] = [];

		for(let line of code.split('\n')) {
			const match = line.match(re);
			if(match) {
				if(include[match[1]]) lines.push(line.split('//')[0].replace(/[ \t]+$/, ''));
			} else lines.push(line);
		}

		code = lines.join('\n');
	}

	if(replace) {
		for(const needle of Object.keys(replace)) {
			code = code.replace(new RegExp(needle, 'g'), replace[needle]);
		}
	}

	return code;
}

export class WireTypes {
	constructor(lines: string[]) {
		for(const snippet of readSnippets(lines)) {
			this.snippets[snippet.id] = snippet;
		}
	}

	toStack(type: Type, spec: ToStackSpec) {
		const wireType = type.wireType || (type.wireType = this.lookup(type));
		const snippet = wireType && this.snippets[wireType.id];
		if(!snippet) return;

		const toStack = snippet.toStack;
		let wireCount = 0;
		const code = transform(toStack.code, wireType.include, wireType.replaceTo || wireType.replace).replace(
			/(\$args[ \t]*\+[ \t]*)([0-9]+)/g,
			(_, args, num) => {
				if(+num >= wireCount) wireCount = +num + 1;
				return args + (+num + spec.wirePos);
			}
		).replace(/\$1/g, spec.name).replace(/\n/g, '\n' + spec.indent);

		return {
			code,
			wireCount,
			jsType: wireType.toStackType || toStack.jsType,
			allocatesWithAlign: wireType.toStackAllocatesWithAlign
		};
	}

	fromStack(type: Type, spec: FromStackSpec) {
		const wireType = type.wireType || (type.wireType = this.lookup(type));
		const snippet = wireType && this.snippets[wireType.id];
		if(!snippet) return;

		const fromStack = snippet.fromStack;

		return {
			code: transform(fromStack.code, wireType.include, wireType.replaceFrom || wireType.replace).replace(/\n/g, '\n' + spec.indent),
			jsType: wireType.fromStackType || fromStack.jsType
		};
	}

	private lookup(type: Type): WireType {
		// Functions defined below aren't called directly. This file is parsed as a string and snippets used in generated code.
		// The returned objects contain hashes of the function source code to match them with the code here.

		// Magic strings that will get transformed:
		// $1 becomes $<number of actual argument>
		// $args + 0 becomes $args + <number of actual stack frame offset>
		// $args + 1 and so on becomes what $args + 0 expands to, plus the given offset

		const child = type.child;

		switch(type.kind) {
			case TypeKind.Void:
				return {
					id: '0772c9ea10737659bebfc67921007f2a34117c49'
				};
			case TypeKind.Bool:
				return {
					id: '9a36457fb892b3405415282d19c00d5ca16f98d7',
					toStack($1: boolean) {
						$F64[$args + 0] = +!!$1;
					},
					fromStack() {
						const $ret: boolean = !!$mem.F64[$args + 0];
					}
				};
			case TypeKind.Int:
				if(type.len > 32) {
					if(type.flags & 1) return {
						id: '69849bbbc057cea20e70e64e55e6402e4d81054b',
						toStack($1: number | bigint) {
							$mem.I64[$args + 0] = BigInt($1);
						},
						fromStack() {
							const $ret: bigint = $mem.I64[$args + 0];
						}
					}; else return {
						id: '61f038672ea268e2b989586af896aa20cd377e8a',
						toStack($1: number | bigint) {
							if($1 < 0) {
								$top = $args;
								throw new RangeError($1 + ' is out of range');
							}
							$mem.U64[$args + 0] = BigInt($1);
						},
						fromStack() {
							const $ret: bigint = $mem.U64[$args + 0];
						}
					};
				} else {
					if(type.flags & 1) return {
						id: '36d391731307a6d7bdb898755bd102d87ba117f7',
						replace: {
							'I8': 'I' + type.len,
							'\\* 8': '* ' + (64 / type.len),
							'128': '' + Math.pow(2, type.len - 1)
						},
						toStack($1: number) {
							if($1 < -128 || $1 >= 128) {
								$top = $args;
								throw new RangeError($1 + ' is out of range');
							}
							$mem.I8[($args + 0) * 8] = $1;
						},
						fromStack() {
							const $ret: number = $mem.I8[($args + 0) * 8];
						}
					}; else return {
						id: 'b6e91b95d5dc08055a7ab7010438025b6ffade39',
						replace: {
							'U8': 'U' + type.len,
							'\\* 8': '* ' + (64 / type.len),
							'256': '' + Math.pow(2, type.len)
						},
						toStack($1: number) {
							if($1 < 0 || $1 >= 256) {
								$top = $args;
								throw new RangeError($1 + ' is out of range');
							}
							$mem.U8[($args + 0) * 8] = $1;
						},
						fromStack() {
							const $ret: number = $mem.U8[($args + 0) * 8];
						}
					};
				}
			case TypeKind.Float: return {
				id: 'a3f9ab50edb4b61b3765d9f386b285d6b80cb4ce',
				toStack($1: number) {
					$F64[$args + 0] = $1;
				},
				fromStack() {
					const $ret: number = $mem.F64[$args + 0];
				}
			};

			case TypeKind.Pointer:
				if(child!.kind == TypeKind.Fn) {
					return {
						id: '4073b493a38864014f0e61d8534a78add172a459',
						toStack($1: CallableFunction) {
							$slots[$slot++] = $1;
						}
					};
				}

				break;

			case TypeKind.Slice:
				if(child!.kind == TypeKind.Int && child!.len == 8) return {
					id: '0ef1c699b1f054d715b8a0502592b552d59b48cc',
					toStackAllocatesWithAlign: 1,
					toStack($1: $Slice | string) {
						if(typeof $1 == "string") {
							const $len = $encoder.encodeInto($1, $mem.U8.subarray($top * 8)).written;
							$F64[$args + 0] = $top * 8 + $mem.base;
							$F64[$args + 1] = $len + $intMagic;
							$top += $len / 8;
						} else {
							$top += $1.toStack($getMemory, $mem, $top, $args + 0) / 8;
						}
					},
					fromStack() {
						const $ret: $Slice = new $Slice($getMemory, $mem.F64[$args + 0], $mem.U32[($args + 1) * 2]);
					}
				};

				return {
					id: 'ec3242f12950a28b99c6060aa312f595f3cd4e54',
					// Allocates when slice isn't from the same memory buffer, detected at runtime.
					toStackAllocatesWithAlign: child!.len / 8,
					toStack($1: $Slice) {
						$top += $1.toStack($getMemory, $mem, $top, $args + 0) / 8;
					},
					fromStack() {
						const $ret: $Slice = new $Slice($getMemory, $args + 0, $args + 1);
					}
				};

			case TypeKind.Struct: return {
				id: '06f24e5e606308211211b42f38216d5c18c8e269',
				replace: {
					'0x0': '' + type.len
				},
				toStackAllocatesWithAlign: 1 / 8,
				toStack($1: $OpaqueStruct) {
					$F64[$args + 0] = $top * 8 + $mem.base;
					$mem.U8.set($1.data, $top * 8);
					$top += 0x0 / 8;
				},
				fromStack() {
					// TODO: Maybe this should also first have a pointer pointing to the data for future-proofing (callback functions with multiple arguments), handle null and error union better on the side
					const $ret: $OpaqueStruct = new $OpaqueStruct($mem.U8.slice($top * 8, $top * 8 + 0x0));
				}
			};

			case TypeKind.Optional: {
				// TODO: Normalize floats to a single NaN before "boxing" and always reserve space before a non-null struct return value passed by value to avoid aliasing with NaN flag.
				const childWire = child!.wireType || (child!.wireType = this.lookup(child!));
				const childSnippet = this.snippets[childWire.id]!;
				let leaf = child!;
				while(leaf.child) leaf = leaf.child;

				return {
					id: '5ed306f0cfe0f89f44aeb624cdff7988e99461a5',
					include: {
						// Include isNaN branch only if child type is a float.
						'isFloat': leaf.kind == TypeKind.Float
					},
					replaceTo: {
						'\\/\\/ CHILD': transform(childSnippet.toStack.code, childWire.include, childWire.replaceTo || childWire.replace).replace(/\n/g, '\n\t').replace(/(let|const)[ \t]+\$ret[ \t]*:[^=;\n]+=/g, '$ret =')
					},
					replaceFrom: {
						'\\/\\/ CHILD': transform(childSnippet.fromStack.code, childWire.include, childWire.replaceFrom || childWire.replace).replace(/\n/g, '\n\t').replace(/(let|const)[ \t]+\$ret[ \t]*:[^=;\n]+=/g, '$ret =')
					},
					toStackAllocatesWithAlign: childWire.toStackAllocatesWithAlign,
					toStackType: '(' + childSnippet.toStack.jsType + ') | null',
					toStack($1: any) {
						{
							let $flag = $1 === null ? 0x7ffc0000 : 0;
							if(isNaN($1)) $flag = 0x7ff80000; // if:isFloat
							$mem.U32[($args + 0) * 2 + 1] = $flag;
						}
						if($1 !== null) {
							// CHILD
						}
					},
					fromStackType: '(' + childSnippet.fromStack.jsType + ') | null',
					fromStack() {
						let $ret: any;
						if($mem.U32[($args + 0) * 2 + 1] == 0x7ffc0000) $ret = null; else {
							// CHILD
						}
					}
				};
			}
		}

		throw new Error('Unknown type');
	}

	snippets: Record<string, Snippet | undefined> = {};
}
