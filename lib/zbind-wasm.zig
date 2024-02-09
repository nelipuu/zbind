const std = @import("std");

const mem = @import("mem.zig");
const typeid = @import("typeid.zig");
const wrapper = @import("wrapper.zig");

const mem_len = 32 * 1024 * 1024;

const Caller = struct {
	pub fn init(comptime func: fn () void) type {
		return struct {
			pub fn call() callconv(.C) void {
				@call(.always_inline, func, .{});
			}
		};
	}
};

pub fn init(comptime API: type, base: [*c]u8) void {
	const Interface = struct {
		pub fn getTypes() callconv(.C) void {
			wrapper.emitTypes(API, Caller);
		}

		pub fn getType() callconv(.C) void {
			typeid.TypeSpec.emit(1);
		}
	};

	mem.U8 = base[0..mem_len];
	mem.U32 = @as([*]u32, @ptrCast(@alignCast(base)))[0 .. mem_len / 4];
	mem.F64 = @as([*]f64, @ptrCast(@alignCast(base)))[0 .. mem_len / 8];

	mem.F64[1] = @sizeOf(*anyopaque);
	mem.F64[2] = @floatFromInt(@intFromPtr(&Interface.getTypes));
	mem.F64[3] = @floatFromInt(@intFromPtr(&Interface.getType));

	comptime var methods = wrapper.getMethods(API, Caller);
	mem.F64[4] = @floatFromInt(methods.len);

	for(methods, 0..) |method, num| {
		mem.F64[num + 5] = @floatFromInt(@as(usize, @intFromPtr(@as(*const fn () callconv(.C) void, @ptrCast(method.call)))));
	}
}
