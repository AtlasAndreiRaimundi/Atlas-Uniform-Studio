import {FONTS} from './core.js';
import {DEFAULT_BASE} from './catalog.js';
import {drawGraphic} from './graphics.js';
import {drawAtlasMark} from '../atlas-logo-mark.js';
export const imageCache=new Map();
export async function imageFor(src){if(imageCache.has(src))return imageCache.get(src);const promise=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Não foi possível ler a imagem.'));im.src=src;});imageCache.set(src,promise);try {const im=await promise;imageCache.set(src,im);return im;}catch(e){imageCache.delete(src);throw e;}}
export function drawLayer(ctx,l,W,H,panel){
 ctx.save();ctx.translate(l.x*W,l.y*H);ctx.rotate((l.type==='text'?0:l.rotation)*Math.PI/180);ctx.globalAlpha=l.opacity;ctx.fillStyle=l.color;
 const w=l.w*W,h=l.h*H;
 if(l.type==='image'){const im=imageCache.get(l.src);if(im&&!(im instanceof Promise))ctx.drawImage(im,-w/2,-h/2,w,h);}
 if(l.type==='text'){
  const family=FONTS.find(f=>f.id===l.font)?.family??FONTS[0].family,text=l.text||'TEXTO';
  ctx.font=`100px ${family}`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  const m=ctx.measureText(text),left=m.actualBoundingBoxLeft??m.width/2,right=m.actualBoundingBoxRight??m.width/2,ascent=m.actualBoundingBoxAscent??80,descent=m.actualBoundingBoxDescent??20;
  const aspect=panel?.cm?.w&&panel?.cm?.h?(panel.cm.w/panel.cm.h)/(W/H):1;
  const scale=Math.min(w/Math.max(1,left+right),h/(Math.max(1,ascent+descent)*aspect));
  ctx.scale(scale,scale*aspect);ctx.fillText(text,(left-right)/2,(ascent-descent)/2);
 }
 if(l.type==='badge')drawAtlasMark(ctx,w,h,l.color,panel?.cm?.w&&panel?.cm?.h?(panel.cm.w/panel.cm.h)/(W/H):1);
 if(l.type==='pattern')drawGraphic(ctx,l.pattern,w,h);
 ctx.restore();
}
export function paint(canvas,panel,{selected=null,grid=false}={}){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle=panel.color;ctx.fillRect(0,0,W,H);
 for(const l of panel.layers)drawLayer(ctx,l,W,H,panel);
 if(grid){ctx.save();ctx.strokeStyle='#ffffff18';ctx.lineWidth=1;for(let k=1;k<10;k++){ctx.beginPath();ctx.moveTo(W*k/10,0);ctx.lineTo(W*k/10,H);ctx.moveTo(0,H*k/10);ctx.lineTo(W,H*k/10);ctx.stroke();}ctx.strokeStyle='#ffffff77';ctx.setLineDash([6,4]);ctx.strokeRect(W*.025,H*.025,W*.95,H*.95);ctx.restore();}
 const l=panel.layers.find(l=>l.id===selected);if(l){ctx.save();ctx.translate(l.x*W,l.y*H);ctx.rotate(l.rotation*Math.PI/180);ctx.strokeStyle='#c5ef65';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(-l.w*W/2,-l.h*H/2,l.w*W,l.h*H);ctx.setLineDash([]);ctx.fillStyle='#fff';for(const x of [-l.w*W/2,l.w*W/2])for(const y of [-l.h*H/2,l.h*H/2]){ctx.fillRect(x-4,y-4,8,8);ctx.strokeRect(x-4,y-4,8,8);}ctx.restore();}
}
