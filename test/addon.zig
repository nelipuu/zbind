const zbind = @import("zbind");

fn Identity(comptime Type: type) type {
	return struct {
		pub fn call(value: Type) Type {
			return value;
		}
	};
}

const API = struct {
	pub const identity_i8 = Identity(i8).call;
	pub const identity_u8 = Identity(u8).call;
	pub const identity_i16 = Identity(i16).call;
	pub const identity_u16 = Identity(u16).call;
	pub const identity_i32 = Identity(i32).call;
	pub const identity_u32 = Identity(u32).call;
	pub const identity_i64 = Identity(i64).call;
	pub const identity_u64 = Identity(u64).call;

	pub const identity_f32 = Identity(f32).call;
	pub const identity_f64 = Identity(f64).call;

	pub const identity_slice_u8 = Identity([]u8).call;
};

pub fn main() void {}

comptime {
	zbind.init(API);
}
