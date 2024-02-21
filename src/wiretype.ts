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
declare let $top: number;

function transform(code: string, replace?: Record<string, string>) {
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
		const code = transform(toStack.code, wireType.replaceTo || wireType.replace).replace(
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
			code: transform(fromStack.code, wireType.replaceFrom || wireType.replace).replace(/\n/g, '\n' + spec.indent),
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
						id: '75f2fa9c8172eb4191bbbab251f44e227c46b5af',
						toStack($1: number | bigint) {
							if($1 < 0) throw new RangeError($1 + ' is out of range');
							$mem.U64[$args + 0] = BigInt($1);
						},
						fromStack() {
							const $ret: bigint = $mem.U64[$args + 0];
						}
					};
				} else {
					if(type.flags & 1) return {
						id: '469d17a63d4d25bc69dad553784125f45ea23a7a',
						replace: {
							'I8': 'I' + type.len,
							'\\* 8': '* ' + (64 / type.len),
							'128': '' + Math.pow(2, type.len - 1)
						},
						toStack($1: number) {
							if($1 < -128 || $1 >= 128) throw new RangeError($1 + ' is out of range');
							$mem.I8[($args + 0) * 8] = ~~$1;
						},
						fromStack() {
							const $ret: number = $mem.I8[($args + 0) * 8];
						}
					}; else return {
						id: '11552aab0aa558194d08aeb2f1cba4d91891b58c',
						replace: {
							'U8': 'U' + type.len,
							'\\* 8': '* ' + (64 / type.len),
							'256': '' + Math.pow(2, type.len)
						},
						toStack($1: number) {
							if($1 < 0 || $1 >= 256) throw new RangeError($1 + ' is out of range');
							$F64[$args + 0] = ($1 >>> 0) + $intMagic;
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
				id: '0e95227d748be1577f9cc1628045037372d2fe2e',
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
					const $ret: $OpaqueStruct = new $OpaqueStruct($mem.U8.slice($top * 8, $top * 8 + 0x0));
				}
			};

			case TypeKind.Optional: {
				// TODO: Don't NaN-box special values if child is a float, which could hold those values without the special meaning.
				const childWire = child!.wireType || (child!.wireType = this.lookup(child!));
				const childSnippet = this.snippets[childWire.id]!;

				return {
					id: 'cf93edb7e54668bf5b31e2bca3f99e13566b24e6',
					replaceTo: {
						'\\/\\/ CHILD': transform(childSnippet.toStack.code, childWire.replaceTo || childWire.replace).replace(/\n/g, '\n\t').replace(/(let|const)[ \t]+\$ret[ \t]*:[^=;\n]+=/g, '$ret =')
					},
					replaceFrom: {
						'\\/\\/ CHILD': transform(childSnippet.fromStack.code, childWire.replaceFrom || childWire.replace).replace(/\n/g, '\n\t').replace(/(let|const)[ \t]+\$ret[ \t]*:[^=;\n]+=/g, '$ret =')
					},
					toStackAllocatesWithAlign: childWire.toStackAllocatesWithAlign,
					toStackType: '(' + childSnippet.toStack.jsType + ') | null',
					toStack($1: any) {
						if($1 === null) {
							$mem.U32[($args + 0) * 2 + 1] = 0x7ff40000;
						} else {
							// Ensure null status is cleared.
							$F64[$args + 0] = 0;
							// CHILD
						}
					},
					fromStackType: '(' + childSnippet.fromStack.jsType + ') | null',
					fromStack() {
						let $ret: any;
						if($mem.U32[($args + 0) * 2 + 1] == 0x7ff40000) $ret = null; else {
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
