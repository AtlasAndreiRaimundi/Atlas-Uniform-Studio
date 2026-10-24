import {PRESENTATION_LAYOUTS} from './presentation-layouts.js';
import {paint,imageFor} from './paint.js';
import {FONTS} from './core.js';

export async function presentationMap(state,{canvasFactory=()=>document.createElement('canvas'),loadFonts=()=>Promise.all(FONTS.map(f=>document.fonts.load('18px '+f.family))),loadImage=imageFor}={}){
 const layout=PRESENTATION_LAYOUTS[state.product];if(!layout||state.model!=='kit-elite-27')throw Error('Este uniforme ainda não possui uma base de apresentação.');
 await Promise.all([loadFonts(),...state.panels.filter(p=>layout.panels.some(q=>q.id===p.id)).flatMap(p=>p.layers).filter(l=>l.type==='image').map(l=>loadImage(l.src))]);
 const atlas=canvasFactory();atlas.width=atlas.height=layout.pageSize;const ctx=atlas.getContext('2d');ctx.clearRect(0,0,atlas.width,atlas.height);
 const panelCanvas=canvasFactory();panelCanvas.width=panelCanvas.height=1024;
 for(const region of layout.panels){const panel=state.panels.find(p=>p.id===region.id);if(!panel)throw Error('O desenho está sem um dos painéis. Reabra o uniforme.');paint(panelCanvas,panel);const {x,y,w,h}=region.rect;ctx.drawImage(panelCanvas,x-2,y-2,w+4,h+4);ctx.drawImage(panelCanvas,x,y,w,h);}
 return new Promise((resolve,reject)=>atlas.toBlob(blob=>blob?resolve(new File([blob],'uniforme-montador.png',{type:'image/png'})):reject(Error('Não foi possível preparar o desenho para a apresentação.')),'image/png'));
}
