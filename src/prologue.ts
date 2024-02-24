// This file gets prepended to generated binding modules.
import {
	$bind,
	Memory as $Memory,
	lazyMemory as $lazyMemory,
	Slice as $Slice,
	OpaqueStruct as $OpaqueStruct
} from './index';

function $defaultPath() {
	return "$PATH";
}

const $decoder = new TextDecoder();
const $encoder = new TextEncoder();
const $intMagic = Math.pow(2, 52);
const $slots: CallableFunction[] = [];

export function $create() {
	let $getMemory: () => $Memory;
	let $wrappers: CallableFunction[];
	let $top: number;
	let $mem = $lazyMemory(() => ($init(), $mem));

	function $callback() {
		// TODO: Slot-specific type conversion.
		$slots[$mem.F64[$top]]();
	}

	function $init(source: BufferSource | string = $defaultPath()) {
		const deps = $bind(source, $callback);
		$getMemory = deps.getMemory;
		$wrappers = deps.wrappers;
		$top = deps.stackBase;
		$mem = $getMemory();
	}

} // END
