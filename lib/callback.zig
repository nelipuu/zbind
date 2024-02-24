const std = @import("std");
const builtin = @import("builtin");
const mem = @import("mem.zig");
const wrapper = @import("wrapper.zig");

pub fn callback(slot: u32) void {
	mem.F64[wrapper.stack_top] = @floatFromInt(slot);

	if(builtin.cpu.arch == .wasm32) {
		const api = struct {
			extern fn _callback() void;
		};

		api._callback();
	} else {
		const napi = @import("napi.zig").napi;
		const zbind = @import("zbind-napi.zig");

		const env = zbind.callback_env;
		var global: napi.napi_value = undefined;
		var func: napi.napi_value = undefined;

		if(napi.napi_get_reference_value(env, zbind.callback, &func) != napi.napi_ok or //
			napi.napi_get_global(env, &global) != napi.napi_ok or //
			napi.napi_call_function(env, global, func, 0, null, null) != napi.napi_ok //
		) @panic("Call failed");
	}
}
