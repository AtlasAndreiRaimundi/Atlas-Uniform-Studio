import {readFile,writeFile} from 'node:fs/promises';
import Zip from 'jszip';
const manifest=JSON.parse(await readFile('scripts/presentation-pack-manifest.json','utf8')),zip=new Zip();
zip.file('LEIA-ME.txt','ATLAS - MAPAS DE DESENHO\n\n17 kits, todos com calção de 2 partes.\n1. Abra MAPA no Corel.\n2. Desenhe no grupo ARTE_DESENHE_AQUI.\n3. Oculte GUIAS_OCULTAR_ANTES_DE_EXPORTAR.\n4. Exporte a página inteira para PNG, 4096 x 4096.\n5. Selecione o mesmo molde na apresentação do ATLAS.\n\nCONFERENCIA é um guia colorido com números dos painéis. Não estique os painéis.\n');
for(const meta of manifest){const folder=['KIT',meta.modeling,meta.collar,(meta.sideCut?'COM RECORTE':'SEM RECORTE')+(meta.variant?' - '+meta.variant:''),'CALCAO 2 PARTES'].join('/');for(const [file,label]of [['template.svg','MAPA'],['proof.svg','CONFERENCIA']])zip.file(folder+'/'+label+' - '+meta.id+'.svg',await readFile('public/assets/molds/'+meta.id+'/'+file));}
await writeFile('public/assets/molds/pack26-mapas.zip',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}}));
