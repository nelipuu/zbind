const std = @import("std");

const mem = @import("mem.zig");
const typeid = @import("typeid.zig");
const WireType = @import("wiretype.zig").WireType;

pub var stack_top: u32 = 0;

pub fn FunctionWrapper(comptime func: anytype, comptime slot: u32) !type {
	const info = @typeInfo(@TypeOf(func)).Fn;
	const Result = info.return_type orelse void;

	comptime var arg_types: []const *const typeid.TypeSpec = &[_]*const typeid.TypeSpec{typeid.typeId(Result)};
	comptime var arg_fields: []const std.builtin.Type.StructField = &[_]std.builtin.Type.StructField{};
	comptime var arg_wire_offsets: []const u32 = &[_]u32{};
	comptime var arg_slots: []const u32 = &[_]u32{};
	comptime var slot_count = 0;

	comptime {
		const params = info.params;
		var wire_pos = 0;

		for(params, 0..) |param, arg_num| {
			const Type = param.type orelse return error.MissingType;
			const Wire = WireType(Type, slot + slot_count);
			arg_types = arg_types ++ [_]*const typeid.TypeSpec{typeid.typeId(Type)};
			arg_wire_offsets = arg_wire_offsets ++ ([_]u32{wire_pos});
			arg_slots = arg_slots ++ ([_]u32{slot + slot_count});
			wire_pos += Wire.count;

			if(@hasDecl(Wire, "slots")) slot_count += Wire.slots;

			arg_fields = arg_fields ++ ([_]std.builtin.Type.StructField{.{ //
				.name = std.fmt.comptimePrint("{}", .{arg_num}),
				.type = param.type.?,
				.default_value = null,
				.is_comptime = false,
				.alignment = @alignOf(param.type.?)
			}});
		}
	}

	// Tuple type capable of holding all Zig parameters of the called Zig function, for passing to @call.
	const Args = @Type(.{
		.Struct = .{ //
			.layout = .Auto,
			.fields = arg_fields,
			.decls = &.{},
			.is_tuple = true
		}
	});

	return struct {
		pub const types: []const *const typeid.TypeSpec = arg_types;

		pub const slots: u32 = slot_count;

		pub fn call() void {
			var args: Args = undefined;

			inline for(arg_wire_offsets, arg_slots, &args) |wire_pos, slot_num, *arg| {
				// Offset by 1 because first entry is stack frame f64 size.
				arg.* = WireType(@TypeOf(arg.*), slot_num).fromStack(mem.F64 + stack_top + 1 + wire_pos);
			}

			const stack_before = stack_top;
			stack_top = mem.U32[stack_top * 2];
			const result = @call(.auto, func, args);
			stack_top = stack_before;

			WireType(Result, 0).toStack(result, mem.F64 + stack_top);
		}
	};
}

const MethodType = struct { //
	call: *const anyopaque,
	name: []const u8,
	args: []const *const typeid.TypeSpec,
	// Number of arguments taking callbacks.
	slots: u32
};

pub fn getMethods(comptime API: type, comptime Caller: type) []const MethodType {
	@setEvalBranchQuota(10000);

	comptime var slot = 0;
	comptime var methods: []const MethodType = &[_]MethodType{};

	comptime for(@typeInfo(API).Struct.decls) |decl| {
		const field = @field(API, decl.name);
		const field_info: std.builtin.Type = @typeInfo(@TypeOf(field));

		if(field_info == .Fn) {
			const Wrapper = FunctionWrapper(field, slot) catch continue;

			methods = methods ++ [_]MethodType{.{ //
				.call = Caller.init(Wrapper.call).call,
				.name = decl.name,
				.args = Wrapper.types,
				.slots = Wrapper.slots
			}};

			slot += Wrapper.slots;
		}
	};

	return methods;
}

pub fn emitTypes(comptime API: type, comptime Caller: type) void {
	const methods = comptime getMethods(API, Caller);
	comptime var len = 1;

	// Compute length of method metadata without names.
	comptime for(methods) |method| {
		len += 3 + method.args.len;
	};

	// Emit offsets to type spec struct fields.
	var pos = typeid.TypeSpec.emitShape();
	// Emit number of methods.
	mem.F64[pos] = @floatFromInt(methods.len);
	pos += 1;

	var name_pos: u32 = (pos + len) * 8;

	for(methods) |method| {
		mem.F64[pos] = @floatFromInt(name_pos);
		mem.F64[pos + 1] = @floatFromInt(method.slots);
		mem.F64[pos + 2] = @floatFromInt(method.args.len);
		pos += 3;

		for(method.args) |arg| {
			mem.F64[pos] = @floatFromInt(@intFromPtr(arg));
			pos += 1;
		}

		@memcpy(mem.U8[name_pos .. name_pos + method.name.len], method.name);
		name_pos += @truncate(method.name.len);
	}
	mem.F64[pos] = @floatFromInt(name_pos);
}
