pub const WireFlags = packed struct(u32) { //
	const Self = @This();

	nullable: bool = false,
	failable: bool = false,
	padding: u30 = 0,

	pub inline fn isZero(self: Self) bool {
		return @as(u32, @bitCast(self)) == 0;
	}
};

pub fn WireType(comptime Type: type, comptime flags: WireFlags) type {
	return switch(@typeInfo(Type)) {
		.Void => struct {
			pub const count = if(flags.isZero()) 0 else 1;

			pub inline fn toStack(_: Type, _: [*]f64) void {}
		},
		.Bool => struct {
			pub const count = 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				// TODO: Handle flags
				return wire[0] != 0;
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				wire[0] = if(value) 1 else 0;
			}
		},

		.Int => struct {
			pub const count = 1 + if(flags.isZero()) 0 else 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				// TODO: Handle flags
				// Assume little-endian for int and float, big-endian systems would need an offset 8 - @sizeOf(Type)
				return @as([*]const Type, @ptrCast(wire))[0];
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				@as([*]Type, @ptrCast(wire))[0] = value;
			}
		},

		.Float => struct {
			pub const count = 1 + if(flags.isZero()) 0 else 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				// TODO: Handle flags
				return @floatCast(wire[0]);
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				wire[0] = @floatCast(value);
			}
		},

		.Pointer => |info| switch(info.size) {
			.Slice => struct {
				pub const count = 2 + if(flags.failable) 1 else 0;

				pub inline fn fromStack(wire: [*]const f64) Type {
					const ptr: [*]info.child = @ptrFromInt(@as(usize, @intFromFloat(wire[0])));
					const len: u32 = @as(*const u32, @ptrCast(&wire[1])).*;

					return ptr[0..len];
				}

				pub inline fn toStack(value: Type, wire: [*]f64) void {
					wire[0] = @floatFromInt(@as(usize, @intFromPtr(value.ptr)));
					@as(*u32, @ptrCast(&wire[1])).* = @truncate(value.len);
				}
			},
			else => struct {
				pub const count = 1 + if(flags.failable) 1 else 0;
			}
		},

		// .Array =>

		.Struct => struct {
			pub const count = 1 + if(flags.failable) 1 else 0;

			pub inline fn fromStack(wire: [*]const f64) Type {
				const ptr: [*]const u8 = @ptrFromInt(@as(usize, @intFromFloat(wire[0])));
				var value: Type = undefined;
				@memcpy(@as([*]u8, @ptrCast(&value)), ptr[0..@sizeOf(Type)]);

				return value;
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				@memcpy(@as([*]u8, @ptrCast(wire)), @as([*]const u8, @ptrCast(&value))[0..@sizeOf(Type)]);
			}
		},

		.Optional => |info| {
			var child_flags = flags;
			child_flags.nullable = true;

			return WireType(info.child, child_flags);
		},
		.ErrorUnion => |info| {
			var child_flags = flags;
			child_flags.failable = true;

			return WireType(info.child, child_flags);
		},

		else => @compileError("Cannot handle type")
	};
}
