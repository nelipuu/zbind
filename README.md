![zbind](https://github.com/nelipuu/zbind/assets/778781/302eee21-1ff4-4e13-868b-05a71532fac9)

# zbind

`zbind` generates TypeScript bindings for calling Zig code compiled to native code or Wasm, in Node.js or Bun or browsers.

Supported Zig versions are 0.11.0 - 0.12.0 (possibly later as well)

Example Zig code [`lib/main.zig`](example/lib/main.zig):

```Zig
const std = @import("std");
const zbind = @import("zbind");

pub fn hello(name: []const u8) void {
    std.debug.print("Hello, {s}!\n", .{ name });
}

comptime {
    zbind.init(@This());
}
```

It exports a Zig function `hello`, callable from TypeScript. A wrapper function will be exported that receives a string pointer and length in memory shared between Zig and the JavaScript engine.

Example TypeScript code [`src/index.ts`](example/src/index.ts) to call it:

```TypeScript
import { hello } from './greet.js';

hello('World');
```

The automatically generated TypeScript function will encode the string as UTF-8 in a buffer directly accessible by both languages.

The Zig code requires a [`build.zig`](example/build.zig) script to compile it:

```Zig
const std = @import("std");
const zbind = @import("node_modules/zbind/zbind.zig");

pub fn build(builder: *std.Build) !void {
    _ = try zbind.build(.{ //
        .builder = builder,
        .main = "lib/main.zig",
        .out = "dist/addon"
    });
}
```

The `zbind.build` call returns a `*std.Build.Step.Compile` object for linking with other libraries if needed.

Run these shell commands to compile the code and generate TypeScript bindings:

```bash
npm install --save zbind
npm install --save-dev node-api-headers

# For native
zig build -Doptimize=ReleaseFast
npx zbind dist/addon.node src/greet.ts

# For Wasm
zig build -Doptimize=ReleaseSmall -Dtarget=wasm32-wasi
npx zbind dist/addon.wasm src/greet.ts
```

The commands compile the Zig code to a native or Wasm binary and then call a TypeScript-based tool to inspect it and generate wrapper functions in `src/greet.ts` with matching types and necessary marshalling.

To install Zig from NPM you can do:

```
npm install --save-dev @oven/zig
```

## Supported data types

| Zig          | TypeScript          | Notes |
|--------------|---------------------|-------|
| `bool`       | `boolean`           |       |
| `u8` - `u32` | `number`            | Conversion from `number` rounds down, throws if outside range. |
| `i8` - `i32` | `number`            | Conversion from `number` rounds towards 0, throws if outside range. |
| `f32`, `f64` | `number`            |       |
| `u64`, `i64` | `bigint`            |       |
| `[]u8`       | `Slice`, `string`   | `Slice` of `u8` has a `toString` method for automatic coercion.<br>Strings are passed through a stack. |
| `struct`     | `OpaqueStruct`      | TypeScript takes ownership of opaque structs passed by value<br>such as `std.mem.Allocator` |
| `?`any above | any above `\| null` |       |

Support is planned for more slice types, pointers, error unions, callbacks and accessing struct fields and methods.

## Architecture

Generated TypeScript bindings are identical for Wasm and Node-API. Values are marshalled using a separate one-megabyte stack mostly accessed through a `[]f64` / `Float64Array`. Since `f64` can represent 53-bit integers, it fits pointers to memory as well. `null` is passed as a special NaN bit pattern.

When compiled, `zbind.zig` analyzes argument and return types of Zig functions at comptime, stores the metadata in a compact binary representation and defines special endpoints for querying functions and types. It generates Zig wrapper functions for Zig methods to handle type marshalling and reports a list of pointers to those functions when initialized.

The `zbind` command line tool loads the compiled binary and queries its metadata endpoints to generate a TypeScript wrapper for each Zig function which calls it automatically converting types. The tool writes out TypeScript source code defining and exporting the wrapper functions.

After importing the generated file in your own TypeScript code and making the first call to Zig code through it, the bindings load the compiled binary.
