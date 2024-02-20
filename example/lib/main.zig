const std = @import("std");
const zbind = @import("zbind");

pub fn hello(name: []const u8) void {
    std.debug.print("Hello, {s}!\n", .{ name });
}

comptime {
    zbind.init(@This());
}
