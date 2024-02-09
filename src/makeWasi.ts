/** Like Node.js Buffer.concat but for Uint8Array, works in browsers. */
function concat(chunks: Uint8Array[]) {
	let bytes = 0;

	for(let chunk of chunks) {
		bytes += chunk.length;
	}

	const data = new Uint8Array(bytes);
	bytes = 0;

	for(let chunk of chunks) {
		data.set(chunk, bytes);
		bytes += chunk.length;
	}

	return data;
}

export function makeWasi(memory: WebAssembly.Memory) {
	const decoder = new TextDecoder('utf-8');
	const WASI_SUCCESS = 0;
	/** Not implemented. */
	const WASI_ENOSYS = 52;

	/** Output buffers, flushed on line break. */
	let fdChunks: Uint8Array[][] = [[], [], []];

	return {
		setMemory: (mem: WebAssembly.Memory) => { memory = mem; },
		args_get: (argv: number, buf: number) => WASI_SUCCESS,
		args_sizes_get: (argcPtr: number, bufLenPtr: number) => {
			new Uint32Array(memory.buffer, argcPtr, 1)[0] = 0;
			new Uint32Array(memory.buffer, bufLenPtr, 1)[0] = 0;

			return WASI_SUCCESS;
		},
		fd_write: (fd: number, chunksPtr: number, chunksLen: number, bytesWrittenPtr: number) => {
			const offsets = new Uint32Array(memory.buffer, chunksPtr, chunksLen * 2);
			const chunks: Uint8Array[] = [];
			let pos: number;

			for(pos = 0; pos < offsets.length; pos += 2) {
				chunks.push(new Uint8Array(memory.buffer, offsets[pos], offsets[pos + 1]));
			}

			const data = concat(chunks);
			pos = data.length;

			// Find last line break in buffer.
			while(pos-- && data[pos] != 10);

			if(pos >= 0) {
				// Decode UTF-8 up to last line break.
				fdChunks[fd].push(data.subarray(0, pos));
				const text = decoder.decode(concat(fdChunks[fd]));

				if(fd == 1) console.log(text);
				if(fd == 2) console.error(text);

				fdChunks[fd] = [];
				if(pos < data.length - 1) fdChunks[fd].push(data.subarray(pos + 1));
			} else {
				fdChunks[fd].push(data);
			}

			new Uint32Array(memory.buffer, bytesWrittenPtr, 1)[0] = data.length;
			return WASI_SUCCESS;
		},
		fd_open: () => WASI_ENOSYS,
		fd_fdstat_get: () => WASI_ENOSYS,
		fd_seek: () => WASI_ENOSYS,
		fd_close: () => WASI_ENOSYS,
		proc_exit: () => WASI_ENOSYS,
		random_get: () => WASI_SUCCESS
	} as Record<string, CallableFunction>;
}
