import {DEFAULT_BASE,DEFAULT_ACCENT,DEFAULT_INK} from './catalog.js';
import {makeState,layer,FONTS} from './core.js';
import {defaultLiveSymmetry} from './symmetry.js';
// Current approved base only. Names exported below stay stable for existing imports.
export const ELITE_MODEL='kit-edge-2027-mapa-v3';
export const ELITE_ASSET='/assets/molds/kit-edge-2027-mapa-v3/model.glb';
export const ELITE_COMPATIBLE_ASSET=ELITE_ASSET;
export async function fetchEliteModel(_compatible=false,fetcher=globalThis.fetch){
 const [manifestResponse,modelResponse]=await Promise.all([fetcher('/assets/molds/kit-edge-2027-mapa-v3/descriptor.json'),fetcher(ELITE_ASSET)]);
 if(!manifestResponse.ok||!modelResponse.ok)throw Error('Não foi possível carregar o KIT EDGE 2027. Recarregue para tentar novamente.');
 const [descriptor,buffer]=await Promise.all([manifestResponse.json(),modelResponse.arrayBuffer()]);
 if(descriptor.id!==ELITE_MODEL||descriptor.panels?.length!==19)throw Error('A base do KIT EDGE 2027 está incompleta.');
 const panels=ELITE_PANELS.map(meta=>{const region=descriptor.panels.find(p=>p.number===meta.number);if(!region)throw Error('Painel ausente na base.');return {...meta,mesh:region.mesh,primitive:region.primitive,rect:region.rect,pageSize:descriptor.pageSize,cm:{w:region.rect.w/descriptor.texelsPerUvUnit*100,h:region.rect.h/descriptor.texelsPerUvUnit*100}};});
 return {manifest:{model:ELITE_MODEL,panels},buffer};
}
export const ELITE_PANELS=[
 {number:1,id:'waist-1',label:'Cós do calção · painel 1',piece:'shorts',group:'Cós do calção',view:'front',trim:true},
 {number:2,id:'waist-2',label:'Cós do calção · painel 2',piece:'shorts',group:'Cós do calção',view:'front',trim:true},
 {number:3,id:'waist-3',label:'Cós do calção · painel 3',piece:'shorts',group:'Cós do calção',view:'back',trim:true},
 {number:4,id:'waist-4',label:'Cós do calção · painel 4',piece:'shorts',group:'Cós do calção',view:'back',trim:true},
 {number:5,id:'short-panel-5',label:'Calção · painel 5',piece:'shorts',group:'Calção',view:'front'},
 {number:6,id:'short-panel-6',label:'Calção · painel 6',piece:'shorts',group:'Calção',view:'front'},
 {number:7,id:'sleeve-strip-7',label:'Filete da manga · painel 7',piece:'shirt',group:'Mangas e filetes',view:'right',trim:true},
 {number:8,id:'sleeve-strip-8',label:'Filete da manga · painel 8',piece:'shirt',group:'Mangas e filetes',view:'left',trim:true},
 {number:9,id:'collar-9',label:'Gola · painel 9',piece:'shirt',group:'Gola',view:'back',trim:true},
 {number:10,id:'collar-10',label:'Gola · painel 10',piece:'shirt',group:'Gola',view:'front',trim:true},
 {number:11,id:'collar-11',label:'Gola · painel 11',piece:'shirt',group:'Gola',view:'front',trim:true},
 {number:12,id:'collar-12',label:'Gola · painel 12',piece:'shirt',group:'Gola',view:'front',trim:true},
 {number:13,id:'collar-13',label:'Gola · painel 13',piece:'shirt',group:'Gola',view:'front',trim:true},
 {number:14,id:'sleeve-left',label:'Manga esquerda · painel 14',piece:'shirt',group:'Mangas e filetes',view:'left'},
 {number:15,id:'sleeve-right',label:'Manga direita · painel 15',piece:'shirt',group:'Mangas e filetes',view:'right'},
 {number:16,id:'side-right',label:'Recorte direito · painel 16',piece:'shirt',group:'Corpo e recortes',view:'right'},
 {number:17,id:'side-left',label:'Recorte esquerdo · painel 17',piece:'shirt',group:'Corpo e recortes',view:'left'},
 {number:18,id:'front',label:'Frente · painel 18',piece:'shirt',group:'Corpo e recortes',view:'front'},
 {number:19,id:'back',label:'Costas · painel 19',piece:'shirt',group:'Corpo e recortes',view:'back'},
];
export const ELITE_PANEL_ORDER=[18,19,17,16,9,10,11,12,13,15,14,7,8,5,6,1,2,3,4];
export function eliteState(panels=ELITE_PANELS){
 const ordered=ELITE_PANEL_ORDER.map(n=>panels.find(p=>p.number===n)).filter(Boolean).map(p=>({...p,cm:p.cm??{w:52,h:70}}));
 const state=makeState(ordered);state.model=ELITE_MODEL;state.title='Meu KIT EDGE 2027';state.trim=DEFAULT_ACCENT.hex;state.trimColorId=DEFAULT_ACCENT.id;
 for(const p of state.panels){p.color=p.trim?state.trim:DEFAULT_BASE.hex;p.colorId=p.trim?DEFAULT_ACCENT.id:DEFAULT_BASE.id;};
 const front=state.panels.find(p=>p.id==='front'),back=state.panels.find(p=>p.id==='back');
 front.layers.push(layer('pattern',{name:'Faixas diagonais',pattern:'diagonal',color:DEFAULT_ACCENT.hex,colorId:DEFAULT_ACCENT.id,x:.82,y:.76,w:.72,h:.8}),layer('badge',{name:'Escudo de exemplo',x:.7,y:.28,w:.145,h:.11}),layer('text',{name:'Nome do time',text:'SEU TIME',font:FONTS[0].id,x:.5,y:.47,w:.63,h:.065}),layer('text',{name:'Número da frente',text:'00',personalization:'player-number',font:FONTS[0].id,x:.5,y:.65,w:.21,h:.14}));
 back.layers.push(layer('text',{name:'Nome do atleta',text:'JOGADOR',personalization:'player-name',font:FONTS[0].id,x:.5,y:.24,w:.62,h:.065}),layer('text',{name:'Número das costas',text:'00',personalization:'player-number',font:FONTS[0].id,x:.5,y:.55,w:.5,h:.31}));
 state.symmetry=defaultLiveSymmetry(state);state.selected=front.layers[1].id;return state;
}
