import { Memory, decoder } from './index';

export enum TypeKind {
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
}

export class Type {
	static init(getMemory: () => Memory, getType: () => void, ptrSize: number, stackBase: number) {
		let offset = stackBase;
		Type.getMemory = getMemory;
		Type.getType = getType;
		Type.ptrSize = ptrSize;
		Type.stackBase = stackBase;
		const mem = getMemory();

		Type.specLen = mem.F64[offset++];
		Type.childPos = mem.F64[offset++];
		Type.lenPos = mem.F64[offset++];
		Type.kindPos = mem.F64[offset++];
		Type.flagsPos = mem.F64[offset++];

		return offset;
	}

	static get(id: number) {
		return Type.types[id] || (Type.types[id] = new Type(id));
	}

	private constructor(id: number) {
		const mem = Type.getMemory();
		const view = new DataView(mem.U8.buffer, Type.stackBase * 8, Type.specLen);
		view.setFloat64(0, id, true);

		Type.getType();

		const child = Type.ptrSize == 8 ? Number(view.getBigUint64(Type.childPos, true)) : view.getUint32(Type.childPos, true);
		const len = view.getUint16(Type.lenPos, true);
		const kind = view.getUint8(Type.kindPos);
		const flags = view.getUint8(Type.flagsPos);

		this.child = child && kind != TypeKind.Struct ? Type.get(child) : null;
		this.name = kind == TypeKind.Struct ? decoder.decode(mem.U8.subarray(Type.specLen, Type.specLen + flags)) : null;
		this.len = len;
		this.kind = kind;
		this.flags = flags;
	}

	private static getMemory: () => Memory;
	private static getType: () => void;
	private static ptrSize: number;
	private static stackBase: number;

	private static types: Record<number, Type> = {};
	private static specLen: number;
	private static childPos: number;
	private static lenPos: number;
	private static kindPos: number;
	private static flagsPos: number;

	child: Type | null;
	name: string | null;
	len: number;
	kind: TypeKind;
	flags: number;
}
