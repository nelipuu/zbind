const std = @import("std");
const mem = @import("mem.zig");

pub const TypeKind = enum(u8) { //
	Unknown = 0,

	// Type,
	Void,
	Bool,

	Int,
	Float,

	Pointer,
	Slice,
	Array,

	Struct,

	Optional,
	ErrorUnion,

	Opaque,
	Fn
};

pub const TypeSpec = struct { //
	const Self = @This();

	pub fn emitShape() u32 {
		const offset = 1;
		mem.F64[offset + 0] = @sizeOf([1]Self);
		mem.F64[offset + 1] = @offsetOf(Self, "child");
		mem.F64[offset + 2] = @offsetOf(Self, "len");
		mem.F64[offset + 3] = @offsetOf(Self, "kind");
		mem.F64[offset + 4] = @offsetOf(Self, "flags");
		return offset + 5;
	}

	pub fn emit(ptr: usize) void {
		@memcpy(mem.U8[8..].ptr, @as([*]const u8, @ptrFromInt(@as(usize, @intFromFloat(mem.F64[ptr]))))[0..@sizeOf(Self)]);
	}

	child: ?*const anyopaque = null,
	len: u16 = 0,
	kind: TypeKind,
	flags: u8 = 0
};

pub fn typeId(comptime Type: type) *const TypeSpec {
	return &(struct {
		pub const spec: TypeSpec = switch(@typeInfo(Type)) {
			.Type => .{ .kind = .Type },
			.Void => .{ .kind = .Void },
			.Bool => .{ .kind = .Bool },

			.Int => |info| .{ .kind = .Int, .len = info.bits, .flags = if(info.signedness == .signed) 1 else 0 },
			.Float => |info| .{ .kind = .Float, .len = info.bits },

			.Pointer => |info| switch(info.size) {
				.Slice => .{ .kind = .Slice, .child = typeId(info.child), .flags = if(info.is_const) 1 else 0 },
				else => .{ .kind = .Pointer, .child = typeId(info.child), .flags = if(info.is_const) 1 else 0 }
			},
			.Array => |info| .{ .kind = .Array, .child = typeId(info.child), .len = info.len },

			// Store name in case type ID isn't completely unique.
			.Struct => .{ .kind = .Struct, .child = @typeName(Type), .len = @sizeOf(Type), .flags = @truncate(@typeName(Type).len) },

			.Optional => |info| .{ .kind = .Optional, .child = typeId(info.child) },
			.ErrorUnion => |info| .{ .kind = .ErrorUnion, .child = typeId(info.payload) },

			// TODO
			.Fn => .{ .kind = .Fn },
			.Opaque => .{ .kind = .Opaque },

			else => .{ .kind = .Unknown }
		};
	}).spec;
}
