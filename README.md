# zbind

`zbind` generates TypeScript bindings for calling Zig code compiled to native code or Wasm, in Node.js or Bun or browsers.

Example Zig code `lib/main.zig`:

```Zig
const std = @import("std");
const zbind = @import("zbind");

pub fn hello(name: []const u8) void {
    std.debug.print("Hello, {s}!\n", .{ name });
}

pub fn main() void {}

comptime {
    zbind.init(@This());
}
```

Example TypeScript code `src/index.ts` to call it:

```TypeScript
import { resolve } from 'path';
import { hello } from '../lib/greet';

hello('World');
```

The Zig code requires a `build.zig` script to compile it:

```Zig
const std = @import("std");
const zbind = @import("node_modules/zbind/zbind.zig");

pub fn build(builder: *std.Build) !void {
    _ = try zbind.build(.{ //
        .builder = builder,
        .root = std.fs.path.dirname(@src().file) orelse ".",
        .main = "lib/main.zig",
        .npm = "node_modules",
        .out_dir = "dist",
        .out_name = "addon"
    });
}
```

Run these shell commands to compile the Zig code and generate TypeScript bindings:

```bash
npm install --save zbind node-api-headers

# For native
zig build -Doptimize=ReleaseFast
npx zbind dist/addon.node lib/greet.ts

# For Wasm
zig build -Doptimize=ReleaseSmall -Dtarget=wasm32-wasi
npx zbind dist/addon.wasm lib/greet.ts
```
