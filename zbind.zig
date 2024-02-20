const std = @import("std");
const builtin = @import("builtin");

pub fn init(comptime API: type) void {
	if(builtin.cpu.arch == .wasm32) {
		const zbind = @import("lib/zbind-wasm.zig");

		// Support linking with libc.
		@export(struct {
			pub fn main(_: c_int, _: *anyopaque) callconv(.C) c_int {
				return 0;
			}
		}.main, .{ .name = "main" });

		@export(struct {
			pub fn init(base: [*c]u8) callconv(.C) u32 {
				return zbind.init(API, base);
			}
		}.init, .{ .name = "init" });
	} else {
		const zbind = @import("lib/zbind-napi.zig");

		@export(struct {
			pub fn register(env: zbind.Env, exports: zbind.Value) callconv(.C) zbind.Value {
				return zbind.init(env, exports, API);
			}
		}.register, .{ .name = "napi_register_module_v1" });
	}
}

pub fn build(config: struct { builder: *std.Build, root: []const u8, main: []const u8, npm: []const u8, out_dir: []const u8, out_name: []const u8 }) !*std.Build.Step.Compile {
	const builder = config.builder;
	const target = builder.standardTargetOptions(.{});
	const optimize = builder.standardOptimizeOption(.{});
	const lib = builder.addSharedLibrary(.{ //
		.name = config.out_name,
		.root_source_file = .{ .path = config.main },
		.target = target,
		.optimize = optimize
	});

	const zbind = builder.createModule(if(@hasField(std.Build.Module, "root_source_file")) .{
		.root_source_file = .{ //
			.path = @src().file
		},
		.imports = &.{}
	} else .{
		.source_file = .{ //
			.path = @src().file
		},
		.dependencies = &.{}
	});

	const arch = (if(@hasField(@TypeOf(target), "cpu_arch")) target else target.query).cpu_arch;

	if(arch == .wasm32) {
		lib.export_memory = true;
		lib.export_table = true;
		(if(@hasField(@TypeOf(lib.*), "export_symbol_names")) lib else lib.root_module).export_symbol_names = &.{"init"};
	} else {
		if((if(@hasDecl(@TypeOf(target), "isDarwin")) target else target.result).isDarwin()) lib.linker_allow_shlib_undefined = true;

		(if(@hasDecl(@TypeOf(zbind.*), "addIncludePath")) zbind else lib).addIncludePath(.{ //
			.path = try std.fs.path.resolve(builder.allocator, &.{ config.root, config.npm, "node-api-headers/include" })
		});
	}

	if(@hasDecl(@TypeOf(lib.*), "addModule")) lib.addModule("zbind", zbind) else lib.root_module.addImport("zbind", zbind);

	builder.getInstallStep().dependOn(&builder.addInstallArtifact(lib, .{
		.dest_dir = .{
			.override = .{ //
				.custom = try std.fs.path.relative(builder.allocator, builder.install_prefix, try std.fs.path.resolve(builder.allocator, &.{ config.root, config.out_dir }))
			}
		},
		.dest_sub_path = try std.fmt.allocPrint(builder.allocator, "{s}{s}", .{ config.out_name, if(arch == .wasm32) ".wasm" else ".node" })
	}).step);

	return lib;
}
