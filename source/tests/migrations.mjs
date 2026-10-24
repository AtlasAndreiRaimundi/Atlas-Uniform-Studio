import {readFile} from 'node:fs/promises';
const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
export const migrations=await Promise.all(journal.entries.map(({tag})=>readFile(new URL(`../drizzle/${tag}.sql`,import.meta.url),'utf8')));
