import { makeWasi } from './makeWasi';
import { $Memory } from './prologue';

interface Page {
	buffer: ArrayBuffer;
	ptr: number;
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

	const mem: $Memory = {
		U8: new Uint8Array(buffer),
		I16: new Int16Array(buffer),
		U16: new Uint16Array(buffer),
		I32: new Int32Array(buffer),
		U32: new Uint32Array(buffer),
		F32: new Float32Array(buffer),
		F64: new Float64Array(buffer)
	};

	(process as any).dlopen({ exports: table }, path);

	return {
		getMemory: () => mem,
		getTypes: table.getTypes,
		getType: table.getType,
		wrappers: table.init(pages),
		base: pages[0].ptr
	};
}

function bindWasm(source: BufferSource | string) {
	if(typeof source == 'string') source = eval('require("fs").readFileSync(source)') as BufferSource;

	const megs = 32;
	let memory = new WebAssembly.Memory({ initial: megs * 16 });
	let buffer: ArrayBuffer | undefined;
	let mem = {} as $Memory;

	function getMemory() {
		if(buffer != memory.buffer) {
			buffer = memory.buffer;

			mem = {
				U8: new Uint8Array(buffer),
				I16: new Int16Array(buffer),
				U16: new Uint16Array(buffer),
				I32: new Int32Array(buffer),
				U32: new Uint32Array(buffer),
				F32: new Float32Array(buffer),
				F64: new Float64Array(buffer)
			};
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
		wrappers,
		base: 0
	};
}

export function $bind(source: BufferSource | string) {
	return typeof source == 'string' && !/\.wasm$/.test(source) ? bindNapi(source) : bindWasm(source);
}
