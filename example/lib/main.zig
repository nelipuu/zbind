const std = @import("std");
const zbind = @import("zbind");

pub fn hello(name: []const u8) void {
    std.debug.print("Hello, {s}!\n", .{ name });
}

pub fn main() void {}

comptime {
    zbind.init(@This());
}
