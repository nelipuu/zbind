import { $bind } from './index';

export interface $Memory {
	U8: Uint8Array,
	I16: Int16Array,
	U16: Uint16Array,
	I32: Int32Array,
	U32: Uint32Array,
	F32: Float32Array,
	F64: Float64Array
}

export function $defaultPath() {
	return "$PATH";
}

export const $decoder = new TextDecoder();
const $encoder = new TextEncoder();
const $intMagic = Math.pow(2, 52);

export function $create(source: BufferSource | string = $defaultPath()) {
	let $getMemory: () => $Memory = () => {
		$init();
		return $getMemory();
	};
	let $wrappers: CallableFunction[];
	let $base: number;
	let $top: number;

	function $init(source: BufferSource | string = $defaultPath()) {
		const deps = $bind(source);
		$getMemory = deps.getMemory;
		$wrappers = deps.wrappers;
		$base = deps.base;
		$top = 0;
	};
} // END
