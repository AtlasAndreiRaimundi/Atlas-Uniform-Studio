import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
export async function writeAtlasFavicons(svg){
 const source=Buffer.from(svg);
 // A new URL replaces browser-cached favicons from the previous brand.
 await fs.writeFile('public/atlas-favicon.svg',source);
 await sharp(source).resize(32,32).png().toFile('public/atlas-favicon-32.png');
 await sharp(source).resize(180,180).png().toFile('public/apple-touch-icon.png');
 const sizes=[16,32,48,64],images=await Promise.all(sizes.map(size=>sharp(source).resize(size,size).png().toBuffer()));
 const header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
 for(let i=0;i<images.length;i++){const at=6+i*16;header[at]=header[at+1]=sizes[i];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;}
 await fs.writeFile('public/favicon.ico',Buffer.concat([header,...images]));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){await writeAtlasFavicons(await fs.readFile('public/favicon.svg','utf8'));console.log('Atlas A favicons prepared: SVG, PNG, Apple and multi-size ICO.');}
