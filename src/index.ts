import { makeWasi } from './makeWasi';

interface Page {
	buffer: ArrayBuffer;
	ptr: number;
}

function bindMemory(base: number, buffer: ArrayBuffer) {
	return {
		base,
		I8: new Int8Array(buffer),
		U8: new Uint8Array(buffer),
		I16: new Int16Array(buffer),
		U16: new Uint16Array(buffer),
		I32: new Int32Array(buffer),
		U32: new Uint32Array(buffer),
		I64: new BigInt64Array(buffer),
		U64: new BigUint64Array(buffer),
		F32: new Float32Array(buffer),
		F64: new Float64Array(buffer)
	};
}

export type Memory = ReturnType<typeof bindMemory>;

export const decoder = new TextDecoder();
export const encoder = new TextEncoder();

export class Slice {
	constructor(private getMemory: () => Memory, public ptr: number, public len: number) {}

	toStack(getMemory: () => Memory, dst: Memory, top: number, arg: number) {
		const ptr = this.ptr;
		const len = this.len;

		// Check if this object belongs to the same instance where it needs to be sent.
		if(getMemory == this.getMemory) {
			dst.F64[arg] = ptr;
			dst.F64[arg + 1] = len;
			return 0;
		} else {
			const dstPtr = top * 8;
			dst.F64[arg] = dstPtr + dst.base;
			dst.U8.subarray(dstPtr, dstPtr + len).set(this.getMemory().U8.subarray(ptr, ptr + len));
			return len;
		}
	}

	toString() {
		const mem = this.getMemory();
		const ptr = this.ptr - mem.base;
		return decoder.decode(mem.U8.subarray(ptr, ptr + this.len));
	}
}

function bindNapi(path: string) {
	const table = {} as {
		init(pages: Page[]): CallableFunction[],
		getTypes(): void,
		getType(): void
	};

	const megs = 32;
	const buffer = new ArrayBuffer(megs * 1024 * 1024);
	const pages: Page[] = [{ buffer, ptr: 0 }];

	(process as any).dlopen({ exports: table }, path);
	const wrappers = table.init(pages);

	const mem = bindMemory(pages[0].ptr, buffer);

	return {
		getMemory: () => mem,
		getTypes: table.getTypes,
		getType: table.getType,
		wrappers
	};
}

function bindWasm(source: BufferSource | string) {
	if(typeof source == 'string') {
		if(typeof require != 'function') throw new Error('Cannot synchronously acquire, pass contents instead: ' + source);
		// Bun eval workaround, need to store in a local variable.
		const r = require;
		source = eval('r("fs").readFileSync(source)') as BufferSource;
	}

	const megs = 32;
	let memory = new WebAssembly.Memory({ initial: megs * 16 });
	let buffer: ArrayBuffer | undefined;
	let mem = {} as Memory;

	function getMemory() {
		if(buffer != memory.buffer) {
			buffer = memory.buffer;
			mem = bindMemory(0, buffer);
		}

		return mem;
	}

	const wasi = makeWasi(memory);
	const module = new WebAssembly.Module(source);
	const imports: WebAssembly.Imports = {};

	for(let dep of WebAssembly.Module.imports(module)) {
		if(dep.kind == 'function' && /^wasi_/.test(dep.module)) {
			const name = dep.name;

			if(wasi[name]) {
				let exportedModule = imports[dep.module];

				if(!exportedModule) {
					exportedModule = {};
					imports[dep.module] = exportedModule;
				}

				exportedModule[name] = wasi[name];
			} else {
				console.error('Missing import %s', dep.module + '.' + name);
			}
		}
	}

	const instance = new WebAssembly.Instance(module, imports);
	const lib: any = instance.exports;
	const table = lib.__indirect_function_table;
	if(lib.memory) wasi.setMemory(memory = lib.memory);

	lib.init(0);
	mem = getMemory();

	const wrappers: CallableFunction[] = [];
	const count = mem.F64[4];
	for(let i = 0; i < count; ++i) wrappers[i] = table.get(mem.F64[i + 5]);

	return {
		getMemory,
		getTypes: table.get(mem.F64[2]),
		getType: table.get(mem.F64[3]),
		wrappers
	};
}

export function $bind(source: BufferSource | string) {
	return typeof source == 'string' && !/\.wasm$/.test(source) ? bindNapi(source) : bindWasm(source);
}
