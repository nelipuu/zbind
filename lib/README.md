# zbind/lib

This directory contains the Zig source code of [zbind](..). All the command line tooling is written in TypeScript, the Zig code only defines a library and API for other Zig projects to use.

The corresponding TypeScript source code is in [`../src`](../src).

## Files

- [`mem.zig`](mem.zig) defines different types of slices for accessing memory shared by Zig and TypeScript code.
- [`napi.zig`](napi.zig) includes the Node-API headers for building native addons.
- [`typeid.zig`](typeid.zig) uses Zig comptime reflection to inspect types and write metadata in a custom binary format to memory accessible by TypeScript, parsed by [`../src/typeid.ts`](../src/typeid.ts).
- [`wiretype.zig`](wiretype.zig) defines type conversions between Zig types and TypeScript types marshalled through a `[]f64`. The corresponding TypeScript code is in [`../src/wiretype.ts`](../src/wiretype.ts).
- [`wrapper.zig`](wrapper.zig) writes the names and types of all functions callable from TypeScript into memory accessible by it, parsed by [`../src/wrapper.ts`](../src/wrapper.ts).
- [`zbind-napi.zig`](zbind-napi.zig) exports pointers to Zig wrapper functions adding type conversion to other functions. It's called by the NAPI entry point `napi_register_module_v1` in [`../zbind.zig`](../zbind.zig).
- [`zbind-wasm.zig`](zbind-wasm.zig) similarly exports pointers to wrapper functions. It's called by the Wasm entry point `init` in [`../zbind.zig`](../zbind.zig).
