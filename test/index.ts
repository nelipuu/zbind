import * as lib from './lib';

function test(name: string, runner: (equals: (a: any, b: any) => void, throws: (func: () => void, name?: string) => void) => void) {
	let count = 0;
	let failed = 0;

	console.warn('Running test: ' + name);

	runner(
		(a: any, b: any) => {
			if(a !== b) {
				console.warn('Should be equal: ', a, b);
				++failed;
			}

			++count;
		},
		(func: () => void, name?: string) => {
			try {
				func();
				console.warn('Should throw', name);
				++failed;
			} catch(e) {}

			++count;
		}
	);

	console.warn('Errors: ' + failed + ' / ' + count + '\n');
}

test("Passing integer types", (equals, throws) => {
	equals(lib.identity_bool(false), false);
	equals(lib.identity_bool(true), true);

	for(let i = 0; i < 256; ++i) {
		equals(lib.identity_i8(i - 128), i - 128);
		equals(lib.identity_u8(i), i);
	}

	for(let i = 0; i < 65536; ++i) {
		equals(lib.identity_i16(i - 32768), i - 32768);
		equals(lib.identity_u16(i), i);
	}

	throws(() => lib.identity_i8(-Math.pow(2, 8 - 1) - 1), 'i8 < min');
	throws(() => lib.identity_i16(-Math.pow(2, 16 - 1) - 1), 'i16 < min');
	throws(() => lib.identity_i32(-Math.pow(2, 32 - 1) - 1), 'i32 < min');
	// throws(() => lib.identity_i64(-Math.pow(2, 64 - 1) - 1), 'i64 < min');

	throws(() => lib.identity_i8(Math.pow(2, 8 - 1)), 'i8 > max');
	throws(() => lib.identity_i16(Math.pow(2, 16 - 1)), 'i16 > max');
	throws(() => lib.identity_i32(Math.pow(2, 32 - 1)), 'i32 > max');
	// throws(() => lib.identity_i64(Math.pow(2, 64 - 1)), 'i64 > max');

	throws(() => lib.identity_u8(-1), 'u8 < 0');
	throws(() => lib.identity_u16(-1), 'u16 < 0');
	throws(() => lib.identity_u32(-1), 'u32 < 0');
	throws(() => lib.identity_u64(-1), 'u64 < 0');

	throws(() => lib.identity_u8(Math.pow(2, 8)), 'u8 > max');
	throws(() => lib.identity_u16(Math.pow(2, 16)), 'u16 > max');
	throws(() => lib.identity_u32(Math.pow(2, 32)), 'u32 > max');
	// throws(() => lib.identity_u64(Math.pow(2, 64)), 'u64 > max');
});

test('Passing floating point types', (equals, throws) => {
	const cases = [
		{ type: "float", min: -149, max: 128, fn: lib.identity_f32 },
		{ type: "double", min: -1075, max: 1024, fn: lib.identity_f64 },
	];

	for(const { type, min, max, fn } of cases) {
		let previous = -1;

		for (let i = min; i <= max; i++) {
			const val = i < max ? Math.pow(2, i) : +Infinity;

			equals(fn(val), val);
			equals(val == previous, false);
			previous = val;
		}
	}
});

test('Passing string types', (equals) => {
	equals('' + lib.identity_slice_u8(''), '');
	equals('' + lib.identity_slice_u8('\0'), '\0');
	equals('' + lib.identity_slice_u8('\0\0'), '\0\0');
	equals('' + lib.identity_slice_u8(' \0\0 '), ' \0\0 ');
	equals('' + lib.identity_slice_u8(' '), ' ');
	equals('' + lib.identity_slice_u8('Hello!'), 'Hello!');
});
