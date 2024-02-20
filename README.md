![zbind](https://github.com/nelipuu/zbind/assets/778781/302eee21-1ff4-4e13-868b-05a71532fac9)

# zbind

`zbind` generates TypeScript bindings for calling Zig code compiled to native code or Wasm, in Node.js or Bun or browsers.

Supported Zig versions are 0.11.0 - Zig 0.12.0-dev.2063 (possibly later as well)

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

Run these shell commands to install the Zig compiler, compile the code and generate TypeScript bindings:

```bash
npm install --save zbind
npm install --save-dev @oven/zig node-api-headers

# For native
zig build -Doptimize=ReleaseFast
npx zbind dist/addon.node src/greet.ts

# For Wasm
zig build -Doptimize=ReleaseSmall -Dtarget=wasm32-wasi
npx zbind dist/addon.wasm src/greet.ts
```

The commands compile the Zig code to a native or Wasm binary and then call a TypeScript-based tool to inspect it and generate wrapper functions in `src/greet.ts` with matching types and necessary marshalling.
