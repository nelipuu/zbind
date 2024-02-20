const std = @import("std");
const zbind = @import("node_modules/zbind/zbind.zig");

pub fn build(builder: *std.Build) !void {
    _ = try zbind.build(.{ //
        .builder = builder,
        .main = "lib/main.zig",
        .out = "addon"
    });
}
