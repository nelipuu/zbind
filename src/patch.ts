import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

import { readSnippets } from './snippets';
import { codePath } from './wiretype';

function patch(path: string) {
	const lines = readFileSync(codePath, 'utf-8').split('\n');
	const snippets = readSnippets(lines);

	for(const snippet of snippets) {
		const code = snippet.toStack.code + '\n//\n' + snippet.fromStack.code + '\n';
		lines[snippet.hashRow] = lines[snippet.hashRow].replace(/(id:[ \t]*')[^']*/, '$1' + createHash('sha1').update(code).digest('hex'));
	}

	writeFileSync(path, lines.join('\n'), 'utf-8');
}

patch(codePath);
