const std = @import("std");

const mem = @import("mem.zig");
const typeid = @import("typeid.zig");
const wrapper = @import("wrapper.zig");

const Caller = struct {
	pub fn init(comptime func: fn () void) type {
		return struct {
			pub fn call() callconv(.C) void {
				@call(.always_inline, func, .{});
			}
		};
	}
};

pub fn init(comptime API: type, mem_ptr: [*c]u8) u32 {
	const Interface = struct {
		pub fn getTypes() callconv(.C) void {
			wrapper.emitTypes(API, Caller);
		}

		pub fn getType() callconv(.C) void {
			typeid.TypeSpec.emit();
		}
	};

	mem.U8 = mem_ptr;
	mem.U32 = @ptrCast(@alignCast(mem_ptr));
	mem.F64 = @ptrCast(@alignCast(mem_ptr));

	// Allocate 16 memory pages for a cross-language data serialization stack.
	const index = @wasmMemoryGrow(0, 16);
	if(index <= 0) @panic("OOM");

	const stack_base = @as(u32, @intCast(index)) * std.wasm.page_size / 8;
	mem.F64[stack_base + 1] = @sizeOf(*anyopaque);
	mem.F64[stack_base + 2] = @floatFromInt(@intFromPtr(&Interface.getTypes));
	mem.F64[stack_base + 3] = @floatFromInt(@intFromPtr(&Interface.getType));

	const methods = comptime wrapper.getMethods(API, Caller);
	mem.F64[stack_base + 4] = @floatFromInt(methods.len);

	for(methods, stack_base..) |method, num| {
		mem.F64[num + 5] = @floatFromInt(@as(usize, @intFromPtr(@as(*const fn () callconv(.C) void, @ptrCast(method.call)))));
	}

	wrapper.stack_top = stack_base;
	typeid.stack_base = stack_base;
	return stack_base;
}
