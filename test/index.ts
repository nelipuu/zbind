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
			} catch(e) { }

			++count;
		}
	);

	console.warn('Errors: ' + failed + ' / ' + count + '\n');
}

test("Passing booleans", (equals, throws) => {
	equals(lib.nop(), void 0);

	for(const val of [true, false]) {
		equals(lib.identity_bool(val), val);
		equals(lib.identity_null_bool(val), val);
	}
});

test('Passing null', (equals) => {
	equals(lib.identity_null_bool(null), null);

	equals(lib.identity_null_u8(null), null);
	equals(lib.identity_null_u16(null), null);
	equals(lib.identity_null_u32(null), null);
	equals(lib.identity_null_u64(null), null);

	equals(lib.identity_null_i8(null), null);
	equals(lib.identity_null_i16(null), null);
	equals(lib.identity_null_i32(null), null);
	equals(lib.identity_null_i64(null), null);

	equals(lib.identity_null_f32(null), null);
	equals(lib.identity_null_f64(null), null);

	equals(lib.identity_null_slice_u8(null), null);
});

test("Passing integer types", (equals, throws) => {
	for(let i = 0; i < 256; ++i) {
		// Test entire u8 range and other unsigned integers near zero.
		equals(lib.identity_u8(i), i);
		equals(lib.identity_u16(i), i);
		equals(lib.identity_u32(i), i);
		equals(lib.identity_u64(i), BigInt(i));

		equals(lib.identity_null_u8(i), i);
		equals(lib.identity_null_u16(i), i);
		equals(lib.identity_null_u32(i), i);
		equals(lib.identity_null_u64(i), BigInt(i));

		// Test entire i8 range and other signed integers near zero.
		equals(lib.identity_i8(i - 128), i - 128);
		equals(lib.identity_i16(i - 128), i - 128);
		equals(lib.identity_i32(i - 128), i - 128);
		equals(lib.identity_i64(i - 128), BigInt(i - 128));

		equals(lib.identity_null_i8(i - 128), i - 128);
		equals(lib.identity_null_i16(i - 128), i - 128);
		equals(lib.identity_null_i32(i - 128), i - 128);
		equals(lib.identity_null_i64(i - 128), BigInt(i - 128));

		// Test unsigned integers near their maximum.
		equals(lib.identity_u16(Math.pow(2, 16) - (256 - i)), Math.pow(2, 16) - (256 - i));
		equals(lib.identity_u32(Math.pow(2, 32) - (256 - i)), Math.pow(2, 32) - (256 - i));
		equals(lib.identity_u64(BigInt(Math.pow(2, 64)) - BigInt(256 - i)), BigInt(Math.pow(2, 64)) - BigInt(256 - i));

		equals(lib.identity_null_u16(Math.pow(2, 16) - (256 - i)), Math.pow(2, 16) - (256 - i));
		equals(lib.identity_null_u32(Math.pow(2, 32) - (256 - i)), Math.pow(2, 32) - (256 - i));
		equals(lib.identity_null_u64(BigInt(Math.pow(2, 64)) - BigInt(256 - i)), BigInt(Math.pow(2, 64)) - BigInt(256 - i));

		// Test signed integers near their minimum.
		equals(lib.identity_i16(-Math.pow(2, 16 - 1) + (255 - i)), -Math.pow(2, 16 - 1) + (255 - i));
		equals(lib.identity_i32(-Math.pow(2, 32 - 1) + (255 - i)), -Math.pow(2, 32 - 1) + (255 - i));
		equals(lib.identity_i64(-BigInt(Math.pow(2, 64 - 1)) + BigInt(255 - i)), -BigInt(Math.pow(2, 64 - 1)) + BigInt(255 - i));

		equals(lib.identity_null_i16(-Math.pow(2, 16 - 1) + (255 - i)), -Math.pow(2, 16 - 1) + (255 - i));
		equals(lib.identity_null_i32(-Math.pow(2, 32 - 1) + (255 - i)), -Math.pow(2, 32 - 1) + (255 - i));
		equals(lib.identity_null_i64(-BigInt(Math.pow(2, 64 - 1)) + BigInt(255 - i)), -BigInt(Math.pow(2, 64 - 1)) + BigInt(255 - i));

		// Test signed integers near their maximum.
		equals(lib.identity_i16(Math.pow(2, 16 - 1) - (256 - i)), Math.pow(2, 16 - 1) - (256 - i));
		equals(lib.identity_i32(Math.pow(2, 32 - 1) - (256 - i)), Math.pow(2, 32 - 1) - (256 - i));
		equals(lib.identity_i64(BigInt(Math.pow(2, 64 - 1)) - BigInt(256 - i)), BigInt(Math.pow(2, 64 - 1)) - BigInt(256 - i));

		equals(lib.identity_null_i16(Math.pow(2, 16 - 1) - (256 - i)), Math.pow(2, 16 - 1) - (256 - i));
		equals(lib.identity_null_i32(Math.pow(2, 32 - 1) - (256 - i)), Math.pow(2, 32 - 1) - (256 - i));
		equals(lib.identity_null_i64(BigInt(Math.pow(2, 64 - 1)) - BigInt(256 - i)), BigInt(Math.pow(2, 64 - 1)) - BigInt(256 - i));
	}

	// Test if out of range values throw.
	throws(() => lib.identity_u8(-1), 'u8 < 0');
	throws(() => lib.identity_u16(-1), 'u16 < 0');
	throws(() => lib.identity_u32(-1), 'u32 < 0');
	throws(() => lib.identity_u64(-1), 'u64 < 0');

	throws(() => lib.identity_null_u8(-1), 'u8 < 0');
	throws(() => lib.identity_null_u16(-1), 'u16 < 0');
	throws(() => lib.identity_null_u32(-1), 'u32 < 0');
	throws(() => lib.identity_null_u64(-1), 'u64 < 0');

	throws(() => lib.identity_u8(Math.pow(2, 8)), 'u8 > max');
	throws(() => lib.identity_u16(Math.pow(2, 16)), 'u16 > max');
	throws(() => lib.identity_u32(Math.pow(2, 32)), 'u32 > max');
	// throws(() => lib.identity_u64(Math.pow(2, 64)), 'u64 > max');

	throws(() => lib.identity_null_u8(Math.pow(2, 8)), 'u8 > max');
	throws(() => lib.identity_null_u16(Math.pow(2, 16)), 'u16 > max');
	throws(() => lib.identity_null_u32(Math.pow(2, 32)), 'u32 > max');
	// throws(() => lib.identity_null_u64(Math.pow(2, 64)), 'u64 > max');

	throws(() => lib.identity_i8(-Math.pow(2, 8 - 1) - 1), 'i8 < min');
	throws(() => lib.identity_i16(-Math.pow(2, 16 - 1) - 1), 'i16 < min');
	throws(() => lib.identity_i32(-Math.pow(2, 32 - 1) - 1), 'i32 < min');
	// throws(() => lib.identity_i64(-Math.pow(2, 64 - 1) - 1), 'i64 < min');

	throws(() => lib.identity_null_i8(-Math.pow(2, 8 - 1) - 1), 'i8 < min');
	throws(() => lib.identity_null_i16(-Math.pow(2, 16 - 1) - 1), 'i16 < min');
	throws(() => lib.identity_null_i32(-Math.pow(2, 32 - 1) - 1), 'i32 < min');
	// throws(() => lib.identity_null_i64(-Math.pow(2, 64 - 1) - 1), 'i64 < min');

	throws(() => lib.identity_i8(Math.pow(2, 8 - 1)), 'i8 > max');
	throws(() => lib.identity_i16(Math.pow(2, 16 - 1)), 'i16 > max');
	throws(() => lib.identity_i32(Math.pow(2, 32 - 1)), 'i32 > max');
	// throws(() => lib.identity_i64(Math.pow(2, 64 - 1)), 'i64 > max');

	throws(() => lib.identity_null_i8(Math.pow(2, 8 - 1)), 'i8 > max');
	throws(() => lib.identity_null_i16(Math.pow(2, 16 - 1)), 'i16 > max');
	throws(() => lib.identity_null_i32(Math.pow(2, 32 - 1)), 'i32 > max');
	// throws(() => lib.identity_null_i64(Math.pow(2, 64 - 1)), 'i64 > max');
});

test('Passing floating point types', (equals, throws) => {
	const cases = [
		{ type: "float", min: -149, max: 128, fn: lib.identity_f32 },
		{ type: "double", min: -1075, max: 1024, fn: lib.identity_f64 },

		{ type: "float", min: -149, max: 128, fn: lib.identity_null_f32 },
		{ type: "double", min: -1075, max: 1024, fn: lib.identity_null_f64 }
	];

	for(const { type, min, max, fn } of cases) {
		let previous = -1;

		for(let i = min; i <= max; ++i) {
			const val = i < max ? Math.pow(2, i) : +Infinity;

			equals(fn(val), val);
			equals(val == previous, false);
			previous = val;
		}

		for(const val of [0, -0]) {
			// Distinguish between positive and negative zero
			equals(1 / fn(val)!, 1 / val);
		}

		for(const val of [0, Infinity, -Infinity]) {
			equals(fn(val), val);
		}

		equals(isNaN(fn(0/0)), true);
	}
});

test('Passing strings', (equals) => {
	for(const text of ['', '\0', '\0\0', ' \0 ', ' ', 'Hello!']) {
		equals('' + lib.identity_slice_u8(text), text);
		equals('' + lib.identity_null_slice_u8(text), text);
	}
});

test('Passing allocators', (equals) => {
	const allocator = lib.get_allocator();
	equals(lib.use_allocator(allocator) > 0, true);
});
