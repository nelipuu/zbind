const std = @import("std");
const zbind = @import("zbind.zig");

pub fn build(builder: *std.Build) !void {
	const lib = try zbind.build(.{ //
		.builder = builder,
		.npm = "node_modules",
		.main = "test/addon.zig",
		.out = "test/addon"
	});

	lib.linkLibC();
}
