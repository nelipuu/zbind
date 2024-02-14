const std = @import("std");
const builtin = @import("builtin");

pub fn init(comptime API: type) void {
	if(builtin.cpu.arch == .wasm32) {
		const zbind = @import("lib/zbind-wasm.zig");

		@export(struct {
			pub fn init(base: [*c]u8) callconv(.C) void {
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
	var lib: *std.Build.Step.Compile = undefined;

	const zbind = builder.createModule(.{
		.root_source_file = .{ //
			.path = @src().file
		},
		.imports = &.{}
	});

	if(target.query.cpu_arch == .wasm32) {
		lib = builder.addExecutable(.{ //
			.name = config.out_name,
			.root_source_file = .{ .path = config.main },
			.target = target,
			.optimize = optimize
		});

		lib.export_memory = true;
		lib.export_table = true;
		lib.root_module.export_symbol_names = &.{"init"};
	} else {
		lib = builder.addSharedLibrary(.{ //
			.name = config.out_name,
			.root_source_file = .{ .path = config.main },
			.target = target,
			.optimize = optimize
		});

		if(target.result.isDarwin()) lib.linker_allow_shlib_undefined = true;

		zbind.addIncludePath(.{ .path = try std.fs.path.resolve(builder.allocator, &.{ config.root, config.npm, "node-api-headers/include" }) });
	}

	lib.root_module.addImport("zbind", zbind);

	lib.linkLibC();

	builder.getInstallStep().dependOn(&builder.addInstallArtifact(lib, .{
		.dest_dir = .{
			.override = .{ //
				.custom = try std.fs.path.relative(builder.allocator, builder.install_prefix, try std.fs.path.resolve(builder.allocator, &.{ config.root, config.out_dir }))
			}
		},
		.dest_sub_path = try std.fmt.allocPrint(builder.allocator, "{s}{s}", .{ config.out_name, if(target.query.cpu_arch == .wasm32) ".wasm" else ".node" })
	}).step);

	return lib;
}
