pub fn WireType(comptime Type: type) type {
	return switch(@typeInfo(Type)) {
		.Void => struct {
			pub const count = 0;

			pub inline fn fromStack(_: [*]const f64) Type {}

			pub inline fn toStack(_: Type, _: [*]f64) void {}
		},
		.Bool => struct {
			pub const count = 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				return wire[0] != 0;
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				wire[0] = if(value) 1 else 0;
			}
		},

		.Int => struct {
			pub const count = 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				// Assume little-endian for int and float, big-endian systems would need an offset 8 - @sizeOf(Type)
				return @as([*]const Type, @ptrCast(wire))[0];
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				@as([*]Type, @ptrCast(wire))[0] = value;
			}
		},

		.Float => struct {
			pub const count = 1;

			pub inline fn fromStack(wire: [*]const f64) Type {
				return @floatCast(wire[0]);
			}

			pub inline fn toStack(value: Type, wire: [*]f64) void {
				wire[0] = @floatCast(value);
			}
		},

		.Pointer => |info| switch(info.size) {
			.Slice => struct {
				pub const count = 2;

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
				pub const count = 1;
			}
		},

		// .Array =>

		.Struct => struct {
			pub const count = 1;

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
			const Child = WireType(info.child);

			return struct {
				pub const count = @max(Child.count, 1);

				pub inline fn fromStack(wire: [*]const f64) Type {
					return if(@as([*]const u32, @ptrCast(wire))[1] == 0x7ffc0000) null else Child.fromStack(wire);
				}

				pub inline fn toStack(value: Type, wire: [*]f64) void {
					if(value == null) {
						@as([*]u32, @ptrCast(wire))[1] = 0x7ffc0000;
					} else {
						// Ensure null status is cleared.
						wire[0] = 0;
						Child.toStack(value.?, wire);
					}
				}
			};
		},
		.ErrorUnion => |info| {
			return WireType(info.child);
		},

		else => @compileError("Cannot handle type")
	};
}
