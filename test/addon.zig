const std = @import("std");
const builtin = @import("builtin");
const zbind = @import("zbind");

fn Test(comptime Type: type) type {
	return struct {
		pub fn identity(value: Type) Type {
			return value;
		}
	};
}

const API = struct {
	pub fn nop() void {}

	// pub const identity_void = Test(void).identity;
	// pub const identity_null_void = Test(?void).identity;

	pub const identity_bool = Test(bool).identity;
	pub const identity_null_bool = Test(?bool).identity;

	pub const identity_i8 = Test(i8).identity;
	pub const identity_u8 = Test(u8).identity;
	pub const identity_i16 = Test(i16).identity;
	pub const identity_u16 = Test(u16).identity;
	pub const identity_i32 = Test(i32).identity;
	pub const identity_u32 = Test(u32).identity;
	pub const identity_i64 = Test(i64).identity;
	pub const identity_u64 = Test(u64).identity;
	pub const identity_null_i8 = Test(?i8).identity;
	pub const identity_null_u8 = Test(?u8).identity;
	pub const identity_null_i16 = Test(?i16).identity;
	pub const identity_null_u16 = Test(?u16).identity;
	pub const identity_null_i32 = Test(?i32).identity;
	pub const identity_null_u32 = Test(?u32).identity;
	pub const identity_null_i64 = Test(?i64).identity;
	pub const identity_null_u64 = Test(?u64).identity;

	pub const identity_f32 = Test(f32).identity;
	pub const identity_f64 = Test(f64).identity;
	pub const identity_null_f32 = Test(?f32).identity;
	pub const identity_null_f64 = Test(?f64).identity;

	pub const identity_slice_u8 = Test([]u8).identity;
	pub const identity_null_slice_u8 = Test(?[]u8).identity;
	// pub const identity_slice_null_u8 = Test([]?u8).identity;

	pub fn get_allocator() std.mem.Allocator {
		return std.heap.page_allocator;
	}

	pub fn use_allocator(allocator: std.mem.Allocator) f64 {
		const ptr = allocator.create(u8) catch @panic("OOM");
		defer allocator.destroy(ptr);

		const result: f64 = @floatFromInt(@intFromPtr(ptr));
		return result;
	}
};

comptime {
	zbind.init(API);
}
