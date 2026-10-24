import {readFile,writeFile} from 'node:fs/promises';
import {navigationHTML} from '../public/studio-navigation.js';

for (const [name,active] of [['pedido','create-order'],['organizador','lists'],['acervo','proposals'],['simulador/editor','simulator']]) {
  const file=new URL('../public/'+name+'.html',import.meta.url);
  let html=await readFile(file,'utf8');
  const marker='<!-- studio-navigation -->',end='<!-- /studio-navigation -->';
  const navigation=marker+navigationHTML(active)+end;
  if(html.includes(marker))html=html.slice(0,html.indexOf(marker))+navigation+html.slice(html.indexOf(end)+end.length);
  else html=html.replace(/<p class="nav-label">[\s\S]*?<\/nav>/,navigation).replace(/\s*<div class="nav-caption">[\s\S]*?<\/div>/,'');
  html=html.replace('<aside class="tool-nav">','<aside class="tool-nav studio-sidebar">');
  if(!html.includes('/studio-navigation.css'))html=html.replace('</head>','<link rel="stylesheet" href="/studio-navigation.css?v=1"><script type="module" src="/studio-navigation-init.js?v=1"></script>\n</head>');
  await writeFile(file,html);
}
