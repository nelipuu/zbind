const std = @import("std");

const mem = @import("mem.zig");
const typeid = @import("typeid.zig");
const wrapper = @import("wrapper.zig");
const napi = @import("napi.zig").napi;

pub const Env = napi.napi_env;
pub const Value = napi.napi_value;

const Caller = struct {
	pub fn init(comptime func: fn () void) type {
		return struct {
			pub fn call(_: Env, _: napi.napi_callback_info) callconv(.C) Value {
				@call(.always_inline, func, .{});
				return null;
			}
		};
	}
};

fn emitFunctions(env: Env, wrappers: Value, comptime API: type) !void {
	const methods = comptime wrapper.getMethods(API, Caller);
	var value: Value = undefined;

	for(methods, 0..) |method, num| {
		if(napi.napi_create_function(env, method.name.ptr, method.name.len, @ptrCast(method.call), null, &value) != napi.napi_ok or //
			napi.napi_set_element(env, wrappers, @truncate(num), value) != napi.napi_ok //
		) return error.Create;
	}
}

fn Module(comptime API: type) type {
	return struct {
		pub fn init(env: Env, info: napi.napi_callback_info) callconv(.C) Value {
			fail: {
				var argc: usize = 1;
				var argv: [1]Value = undefined;

				if(napi.napi_get_cb_info(env, info, &argc, &argv, null, null) != napi.napi_ok) break :fail;

				// argv[0] should be an array of objects like { buf: ArrayBuffer, ptr: number },
				// so more memory can be allocated in Zig without immediately coordinating with JS.
				var is_array: bool = undefined;
				var has_element: bool = undefined;

				if(argc < 1 or napi.napi_is_array(env, argv[0], &is_array) != napi.napi_ok or !is_array) break :fail;
				if(napi.napi_has_element(env, argv[0], 0, &has_element) != napi.napi_ok or !has_element) break :fail;

				var page: Value = undefined;
				var value_type: napi.napi_valuetype = undefined;

				if(napi.napi_get_element(env, argv[0], 0, &page) != napi.napi_ok) break :fail;
				if(napi.napi_typeof(env, page, &value_type) != napi.napi_ok or value_type != napi.napi_object) break :fail;

				var has_buffer: bool = undefined;
				var buffer: Value = undefined;

				if(napi.napi_has_named_property(env, page, "buffer", &has_buffer) != napi.napi_ok or !has_buffer) break :fail;
				if(napi.napi_get_named_property(env, page, "buffer", &buffer) != napi.napi_ok) break :fail;

				var is_arraybuffer: bool = undefined;
				var mem_ptr: [*]u8 = undefined;
				var mem_len: usize = 0;

				if(napi.napi_is_arraybuffer(env, buffer, &is_arraybuffer) != napi.napi_ok or !is_arraybuffer) break :fail;
				if(napi.napi_get_arraybuffer_info(env, buffer, @ptrCast(&mem_ptr), &mem_len) != napi.napi_ok or mem_len < std.mem.page_size * 2) break :fail;

				var ptr: Value = undefined;

				// Start address of buffer, to subtract from pointers when dereferencing in JS.
				if(napi.napi_create_double(env, @floatFromInt(@intFromPtr(mem_ptr)), &ptr) != napi.napi_ok) break :fail;
				if(napi.napi_set_named_property(env, page, "ptr", ptr) != napi.napi_ok) break :fail;

				var wrappers: Value = undefined;
				if(napi.napi_create_array(env, &wrappers) != napi.napi_ok) break :fail;

				var ref: napi.napi_ref = undefined;
				if(napi.napi_create_reference(env, argv[0], 1, &ref) != napi.napi_ok) break :fail;

				mem.U8 = mem_ptr[0..mem_len];
				mem.U32 = @as([*]u32, @ptrCast(@alignCast(mem_ptr)))[0 .. mem_len / 4];
				mem.F64 = @as([*]f64, @ptrCast(@alignCast(mem_ptr)))[0 .. mem_len / 8];

				mem.F64[0] = std.mem.page_size;
				mem.F64[1] = @sizeOf(*anyopaque);

				emitFunctions(env, wrappers, API) catch break :fail;
				return wrappers;
			}

			_ = napi.napi_throw_error(env, null, @as([*c]const u8, @ptrCast(std.fmt.comptimePrint("First argument must be a non-empty array of Page objects with a buffer at least {} bytes", .{std.mem.page_size * 2}))));
			return null;
		}

		pub fn getTypes(_: Env, _: napi.napi_callback_info) callconv(.C) Value {
			wrapper.emitTypes(API, Caller);
			return null;
		}

		pub fn getType(_: Env, _: napi.napi_callback_info) callconv(.C) Value {
			typeid.TypeSpec.emit(1);
			return null;
		}
	};
}

pub fn cstring(comptime str: []const u8) [str.len + 1]u8 {
	var cstr: [str.len + 1]u8 = undefined;

	for(str, 0..) |char, i| cstr[i] = char;

	cstr[str.len] = 0;
	return cstr;
}

pub fn init(env: Env, exports: Value, comptime API: type) Value {
	const Interface = Module(API);
	comptime var desc: []const napi.napi_property_descriptor = &[_]napi.napi_property_descriptor{};

	comptime for(@typeInfo(Interface).Struct.decls) |decl| {
		desc = desc ++ [_]napi.napi_property_descriptor{.{ //
			.utf8name = &cstring(decl.name),
			.name = null,
			.method = @field(Interface, decl.name),
			.getter = null,
			.setter = null,
			.value = null,
			.attributes = napi.napi_default,
			.data = null
		}};
	};

	if(napi.napi_define_properties(env, exports, desc.len, desc.ptr) != napi.napi_ok) {
		_ = napi.napi_throw_error(env, null, @as([*c]const u8, @ptrCast("Unable to register module")));
		return null;
	}

	return exports;
}
