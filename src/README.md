# zbind/src

This directory contains the TypeScript source code of [zbind](..). In the published NPM package it's been transpiled to JavaScript under `../dist`.

The corresponding Zig source code is in [`../lib`](../lib).

## Files

- [`emit.ts`](emit.ts) writes out the contents of [`prologue.ts`](prologue.ts) and wrappers for Zig functions passed to `init` in [`../zbind.zig`](../zbind.zig).
- [`generate.ts`](generate.ts) is the main entry point for the binding generation tool, taking as command line arguments the file names of a compiled binary and TypeScript bindings to generate.
- [`index.ts`](index.ts) is the main package export, defining zbind's run-time API that gets called by the generated bindings.
- [`makeWasi.ts`](makeWasi.ts) defines a barebones WASI interface capable of writing to stdout (`console.log`) and stderr (`console.error`).
- [`patch.ts`](patch.ts) updates SHA1 hashes in [`wiretype.ts`](wiretype.ts), used for matching methods in returned objects to their TypeScript source code. Exact hashes don't matter as long as they're unique.
- [`prologue.ts`](prologue.ts) contents are inserted to generated bindings to set up necessary variables and load the compiled binary the bindings will call.
- [`snippets.ts`](snippets.ts) extracts TypeScript source code in [`wiretype.ts`](wiretype.ts) methods and allows retrieving them by SHA1 hashes.
- [`tsconfig.json`](tsconfig.json) configures the TypeScript compiler to transpile these files to JavaScript and write the output in `../dist`.
- [`typeid.ts`]() parses type metadata in a custom binary format produced by [`../lib/typeid.zig`](../lib/typeid.zig).
- [`wiretype.ts`](wiretype.ts) defines type conversions between TypeScript types and Zig types marshalled through a `Float64Array`. The corresponding Zig code is in [`../lib/wiretype.zig`](../lib/wiretype.zig).
- [`wrapper.ts`](wrapper.ts) reads Zig function names and types produced by [`../lib/wrapper.zig`](../lib/wrapper.zig), and emits corresponding TypeScript wrapper functions marshalling argument and return types.
