/** Represents a brace-enclosed block of code, used for finding code blocks containing type handlers. */

interface Block {
	indent: number;
	start: number;
	end: number;
	/** Type from the argument of an enclosing toStack function, or fromStack $ret constant inside this block. */
	jsType?: string;
	/** SHA1 of code inside catenated toStack and fromStack blocks, to identify handler code for this type. */
	hash?: string;
	hashRow?: number;
	toStack?: Block;
	fromStack?: Block;
}

function getCode(lines: string[], block?: Block) {
	return block ? lines.slice(block.start, block.end).map((line) => line.substring(block.indent)).join('\n') : '';
}

export class Snippet {
	constructor(lines: string[], public id: string, public hashRow: number, toStack?: Block, fromStack?: Block) {
		this.toStack = {
			code: getCode(lines, toStack),
			jsType: (toStack && toStack.jsType) || 'void'
		};

		this.fromStack = {
			code: getCode(lines, fromStack),
			jsType: (fromStack && fromStack.jsType) || 'void'
		};
	}

	toStack: {
		code: string,
		jsType: string
	};

	fromStack: {
		code: string,
		jsType: string
	};
}

export function readSnippets(lines: string[]) {
	const snippets: Snippet[] = [];

	let block: Block = { indent: 0, start: 0, end: 0 }
	let stack: Block[] = [];
	let capture: 'toStack' | 'fromStack' | '' = '';
	let jsType: string | undefined;

	for(let row = 0; row < lines.length; ++row) {
		const line = lines[row];
		const indent = line.match(/^[ \t]*/)![0].length;

		if(indent > block.indent) {
			const parent = block;
			stack.push(block);

			block = { indent, start: row, end: row, jsType };

			if(capture) {
				parent[capture] = block;
				capture = '';
				jsType = void 0;
			}
		} else if(indent < block.indent) {
			block.end = row;

			if(block.hashRow) {
				snippets.push(new Snippet(lines, block.hash || '', block.hashRow, block.toStack, block.fromStack));
			}

			do {
				block = stack.pop()!;
			} while(indent < block.indent);
		}

		let match = line.match(/^[ \t]*id:[ \t]*['"]([^']*)['"]/);
		if(match) {
			block.hash = match[1];
			block.hashRow = row;
		}

		match = line.match(/^[ \t]*(toStack|fromStack)[ \t]*\(([ \t]*\$1[ \t]*:[ \t]*([^,)]+))?/);
		if(match) {
			capture = match[1] as 'toStack' | 'fromStack';
			jsType = match[3];
		}

		match = line.match(/^[ \t]*(let|const)[ \t]+\$ret[ \t]*:[ \t]*([^=;]+)[=;]/);
		if(match) {
			block.jsType = match[2].replace(/[ \t]+$/, '');
		}
	}

	return snippets;
}
