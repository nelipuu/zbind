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

export function $create() {
	let $getMemory: () => $Memory;
	let $wrappers: CallableFunction[];
	let $top: number;
	let $mem = $lazyMemory(() => ($init(), $mem));

	function $init(source: BufferSource | string = $defaultPath()) {
		const deps = $bind(source);
		$getMemory = deps.getMemory;
		$wrappers = deps.wrappers;
		$top = deps.stackBase;
		$mem = $getMemory();
	}

} // END
