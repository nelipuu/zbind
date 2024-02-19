// This file gets prepended to generated binding modules.
import {
	$bind,
	Memory as $Memory,
	Slice as $Slice
} from './index';

function $defaultPath() {
	return "$PATH";
}

const $decoder = new TextDecoder();
const $encoder = new TextEncoder();
const $intMagic = Math.pow(2, 52);

function $create(source: BufferSource | string = $defaultPath()) {
	let $getMemory: () => $Memory = () => {
		$init();
		return $getMemory();
	};
	let $wrappers: CallableFunction[];
	let $top: number;

	function $init(source: BufferSource | string = $defaultPath()) {
		const deps = $bind(source);
		$getMemory = deps.getMemory;
		$wrappers = deps.wrappers;
		$top = deps.stackBase;
	};
} // END
