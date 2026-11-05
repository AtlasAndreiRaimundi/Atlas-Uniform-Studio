// Brand marks remain original-color images. Imported graphic vectors are
// a separate class: recolored to the user's chosen single palette color.
export function tintSVGDataUrl(src,color,{Parser=DOMParser,Serializer=XMLSerializer}={}){
 if(typeof src!=='string'||!src.startsWith('data:image/svg+xml;charset=utf-8,')||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Escolha um SVG vetorial e uma cor da paleta.');
 let xml;try{xml=decodeURIComponent(src.slice(src.indexOf(',')+1));}catch{throw Error('Grafismo SVG inválido.');}
 const doc=new Parser().parseFromString(xml,'image/svg+xml'),root=doc.documentElement;
 if(root?.localName!=='svg'||doc.querySelector('parsererror'))throw Error('Grafismo SVG inválido.');
 const shapes=root.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon,use');
 for(const shape of shapes){
  const fill=shape.getAttribute('fill'),stroke=shape.getAttribute('stroke');
  if(fill!=='none')shape.setAttribute('fill',color);
  if(stroke&&stroke!=='none')shape.setAttribute('stroke',color);
 }
 for(const stop of root.querySelectorAll('stop'))stop.setAttribute('stop-color',color);
 for(const group of [root,...root.querySelectorAll('g')]){
  if(group.getAttribute('fill')!=='none')group.setAttribute('fill',color);
  const stroke=group.getAttribute('stroke');if(stroke&&stroke!=='none')group.setAttribute('stroke',color);
 }
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new Serializer().serializeToString(root));
}
