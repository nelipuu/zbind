import { dirname, resolve, relative } from 'path';
import { writeFileSync } from 'fs';
import { emitSource } from './emit';
import { Type } from './typeid';
import { $bind } from './index';

const { getMemory, getTypes, getType, stackBase } = $bind(process.argv[2]);
const mem = getMemory();
const ptrSize = mem.F64[stackBase + 1];

let path = relative(dirname(resolve(process.argv[3])), resolve(process.argv[2]));
if(!/^\.?\.?\//.test(path)) path = './' + path;

getTypes();
writeFileSync(process.argv[3], emitSource(mem, Type.init(getMemory, getType, ptrSize, stackBase), path));
