export const GRAPHICS=[
 ['horizontal-line','Linha reta','Linhas',.8,.035],['straight-line','Linha vertical','Linhas',.04,.8],['pinstripes','Listras finas','Clássicos'],['stripes','Listras verticais','Clássicos'],['h-stripes','Listras horizontais','Clássicos'],['center-stripe','Faixa central','Clássicos'],['chest-band','Faixa no peito','Clássicos'],['double-band','Faixa dupla','Clássicos'],['sash','Faixa transversal','Clássicos'],['double-sash','Transversal dupla','Clássicos'],['side-stripes','Faixas laterais','Clássicos'],['half','Duas metades','Recortes'],['quarter','Quadriculado clássico','Clássicos'],['diagonal','Diagonais','Recortes'],['chevron','Chevron','Recortes'],['v-chest','V no peito','Clássicos'],['shoulders','Recortes nos ombros','Recortes'],['sleeve-bands','Faixas de manga','Clássicos'],['wave','Onda','Recortes'],['zigzag','Zigue-zague','Texturas'],['fade','Degradê','Texturas'],['blocks','Xadrez','Texturas'],['halftone','Pontilhado','Texturas'],['grid','Grade fina','Texturas'],['speed','Linhas de movimento','Recortes'],['cut','Recorte diagonal','Recortes']
].map(([id,name,group,w=.9,h=.9])=>({id,name,group,w,h}));
export const GRAPHIC_IDS=new Set(GRAPHICS.map(g=>g.id));
export function drawGraphic(ctx,id,w,h){
 ctx.beginPath();ctx.rect(-w/2,-h/2,w,h);ctx.clip();
 const rect=(x,y,a,b)=>ctx.fillRect(x*w-w/2,y*h-h/2,a*w,b*h);
 const poly=points=>{ctx.beginPath();points.forEach(([x,y],i)=>(i?ctx.lineTo(x*w-w/2,y*h-h/2):ctx.moveTo(x*w-w/2,y*h-h/2)));ctx.closePath();ctx.fill();};
 if(id==='horizontal-line')rect(0,0,1,1);
 if(id==='straight-line')rect(0,0,1,1);
 if(id==='stripes'||id==='pinstripes'){const step=id==='pinstripes'?.105:.25,width=id==='pinstripes'?.015:.12;for(let x=.06;x<1;x+=step)rect(x,0,width,1);}
 if(id==='h-stripes')for(let y=.05;y<1;y+=.24)rect(0,y,1,.12);
 if(id==='center-stripe')rect(.36,0,.28,1);
 if(id==='chest-band')rect(0,.35,1,.22);
 if(id==='double-band'){rect(0,.32,1,.13);rect(0,.5,1,.055);}
 if(id==='sash'||id==='double-sash'){poly([[-.2,0],[.04,0],[1.2,1],[.96,1]]);if(id==='double-sash')poly([[.14,0],[.21,0],[1.37,1],[1.30,1]]);}
 if(id==='side-stripes'){rect(0,0,.11,1);rect(.89,0,.11,1);rect(.15,0,.02,1);rect(.83,0,.02,1);}
 if(id==='half')rect(0,0,.5,1);
 if(id==='quarter'){rect(0,0,.5,.5);rect(.5,.5,.5,.5);}
 if(id==='diagonal')for(let i=-3;i<7;i++){const x=i*.26;poly([[x-.5,0],[x-.37,0],[x+.43,1],[x+.3,1]]);}
 if(id==='chevron'||id==='v-chest')for(let i=(id==='v-chest'?1:-2);i<(id==='v-chest'?2:4);i++){const y=i*.3;poly([[0,y-.2],[.5,y+.04],[1,y-.2],[1,y-.08],[.5,y+.16],[0,y-.08]]);}
 if(id==='shoulders'){poly([[0,0],[.42,0],[.26,.18],[0,.3]]);poly([[1,0],[.58,0],[.74,.18],[1,.3]]);}
 if(id==='sleeve-bands'){rect(0,.72,1,.08);rect(0,.85,1,.035);}
 if(id==='wave'){ctx.beginPath();ctx.moveTo(-w/2,h/2);ctx.bezierCurveTo(-w*.1,-h*.5,w*.15,h*.65,w/2,-h/2);ctx.lineTo(w/2,h/2);ctx.closePath();ctx.fill();}
 if(id==='fade'){const g=ctx.createLinearGradient(0,-h/2,0,h/2),color=ctx.fillStyle;g.addColorStop(0,color+'00');g.addColorStop(1,color);ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);}
 if(id==='blocks')for(let y=0;y<6;y++)for(let x=0;x<6;x++)if((x+y)%2===0)rect(x/6,y/6,1/6,1/6);
 if(id==='grid'){for(let i=0;i<12;i++){rect(i/12,0,.007,1);rect(0,i/12,1,.007);}}
 if(id==='halftone')for(let y=0;y<15;y++)for(let x=0;x<13;x++){ctx.beginPath();ctx.ellipse((x/12-.5)*w,(y/14-.5)*h,w*.022*(y+1)/15,h*.022*(y+1)/15,0,0,Math.PI*2);ctx.fill();}
 if(id==='zigzag')for(let i=-1;i<5;i++){const y=i*.25;poly([[0,y],[.25,y+.15],[.5,y],[.75,y+.15],[1,y],[1,y+.07],[.75,y+.22],[.5,y+.07],[.25,y+.22],[0,y+.07]]);}
 if(id==='speed')for(let i=0;i<8;i++)poly([[.1+i*.1,0],[.13+i*.1,0],[.8,1],[.78,1]]);
 if(id==='cut')poly([[0,1],[1,.25],[1,1]]);
}
