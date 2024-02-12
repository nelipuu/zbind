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
