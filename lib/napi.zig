const std = @import("std");

const napi_version = 3;
pub const napi = @cImport({
	@cDefine("NAPI_VERSION", std.fmt.comptimePrint("{}", .{napi_version}));
	@cInclude("node_api.h");
});

export fn node_api_module_get_api_version_v1() i32 {
	return napi_version;
}
