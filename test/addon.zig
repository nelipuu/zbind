const std = @import("std");
const zbind = @import("zbind");

fn printGreeting(name: []const u8, a: u32, b: u32) void {
	std.debug.print("Hello, {s} {}!\n", .{ name, a + b });
}

const API = struct {
	pub const greet = printGreeting;
	pub fn add(a: f64, b: f64) f64 {
		return a + b;
	}
};

pub fn main() void {}

comptime {
	zbind.init(API);
}
