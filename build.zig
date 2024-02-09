const std = @import("std");
const zbind = @import("zbind.zig");

pub fn build(builder: *std.Build) !void {
	_ = try zbind.build(.{ //
		.root = std.fs.path.dirname(@src().file) orelse ".",
		.builder = builder,
		.main = "test/addon.zig",
		.npm = "node_modules",
		.out_dir = "test",
		.out_name = "addon"
	});
}
