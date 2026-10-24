import {drawBrandLogo} from './brand-assets.js';
import { Color, PerspectiveCamera, Vector2, Vector3, Vector4 } from './vendor/three/build/three.module.min.js';
import { isDarkBackdrop, paintBackdrop, sanitizeVisuals } from './presentation.js';

// ESQ/DIR follow the approved map: the sides as seen from the front.
export const FOUR_VIEWS = Object.freeze([
  Object.freeze({ id: 'front', label: 'FRENTE', direction: [0, 0.12, 1] }),
  Object.freeze({ id: 'back', label: 'COSTAS', direction: [0, 0.12, -1] }),
  Object.freeze({ id: 'left', label: 'LATERAL ESQUERDA', direction: [-1, 0.12, 0] }),
  Object.freeze({ id: 'right', label: 'LATERAL DIREITA', direction: [1, 0.12, 0] }),
]);

export const FOUR_VIEW_SHEET = Object.freeze({
  width: 4096, height: 2304, margin: 128, gap: 40,
  frameWidth: 930, frameHeight: 1536, frameTop: 398,
});

export function createFourViewCameras(bounds, { aspect, fov = 32, padding = 1.12 } = {}) {
  if (bounds.isEmpty() || !Number.isFinite(aspect) || aspect <= 0) throw new Error('O molde ainda não está pronto para exportar.');
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  if (![...center.toArray(), ...size.toArray()].every(Number.isFinite) || size.length() === 0) throw new Error('O molde está sem geometria utilizável.');
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z));
  const cameras = FOUR_VIEWS.map((view) => {
    const camera = new PerspectiveCamera(fov, aspect, 0.03, 100);
    camera.position.copy(center).add(new Vector3(...view.direction).normalize());
    camera.lookAt(center); camera.updateMatrixWorld(true);
    return camera;
  });
  const tanY = Math.tan(fov * Math.PI / 360), tanX = tanY * aspect;
  let distance = 0;
  for (const camera of cameras) {
    const inverseRotation = camera.quaternion.clone().invert();
    for (const corner of corners) {
      const p = corner.clone().sub(center).applyQuaternion(inverseRotation);
      distance = Math.max(distance, p.z + Math.abs(p.x) * padding / tanX, p.z + Math.abs(p.y) * padding / tanY, p.z + 0.06);
    }
  }
  // One distance for all four views keeps the piece at the same scale.
  for (const [index, camera] of cameras.entries()) {
    camera.position.copy(center).addScaledVector(new Vector3(...FOUR_VIEWS[index].direction).normalize(), distance);
    camera.far = Math.max(100, distance + size.length() * 2);
    camera.lookAt(center); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  }
  return cameras;
}

// Keep this transaction synchronous: no RAF, resize or pointer event can run
// between resizing the drawing buffer and restoring the live presentation.
// Only export cameras are moved. Controls, artwork, lights and live camera stay intact.
export function captureFourViews({ renderer, scene, liveCamera, bounds, onCapture,
  width = FOUR_VIEW_SHEET.frameWidth, height = FOUR_VIEW_SHEET.frameHeight, transparent=false, hideObjects=[] }) {
  const cameras = createFourViewCameras(bounds, { aspect: width / height, fov: liveCamera.fov });
  return captureCameras({renderer,scene,liveCamera,width,height,cameras:cameras.map((camera,index)=>({id:FOUR_VIEWS[index].id,camera})),onCapture,transparent,hideObjects});
}

export function captureCameras({renderer,scene,liveCamera,width,height,cameras,onCapture,transparent=false,hideObjects=[]}) {
  const saved = {
    size: renderer.getSize(new Vector2()), ratio: renderer.getPixelRatio(),
    viewport: renderer.getViewport(new Vector4()), scissor: renderer.getScissor(new Vector4()),
    scissorTest: renderer.getScissorTest(), target: renderer.getRenderTarget(),
    cubeFace: renderer.getActiveCubeFace(), mipLevel: renderer.getActiveMipmapLevel(),
    background:scene.background, clearColor:renderer.getClearColor?.(new Color()), clearAlpha:renderer.getClearAlpha?.(),
    visibility:hideObjects.filter(Boolean).map(object=>[object,object.visible]),
  };
  try {
    if(transparent){scene.background=null;renderer.setClearColor?.(0x000000,0);for(const [object] of saved.visibility)object.visible=false;}
    renderer.setPixelRatio(1); renderer.setSize(width, height, false);
    renderer.setRenderTarget(null); renderer.setScissorTest(false);
    for (const entry of cameras) {
      renderer.render(scene, entry.camera);
      // Copy each frame before the same WebGL drawing buffer is rendered again.
      onCapture(entry.id, renderer.domElement);
    }
  } finally {
    scene.background=saved.background;
    if(saved.clearColor)renderer.setClearColor(saved.clearColor,saved.clearAlpha);
    for(const [object,visible] of saved.visibility)object.visible=visible;
    renderer.setPixelRatio(saved.ratio); renderer.setSize(saved.size.x, saved.size.y, false);
    renderer.setRenderTarget(saved.target, saved.cubeFace, saved.mipLevel);
    renderer.setViewport(saved.viewport); renderer.setScissor(saved.scissor);
    renderer.setScissorTest(saved.scissorTest);
    renderer.render(scene, liveCamera);
  }
}

// Trim by alpha, never by color: white fabric and dark artwork remain intact.
export function alphaBounds(canvas){
  const {width,height}=canvas,pixels=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw new Error('Uma das quatro vistas ficou vazia. Aguarde o molde carregar e tente novamente.');
  return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}

export function composeTransparentFourViews(target,{captureViews,settings={},maxWidth=4096,makeCanvas=()=>document.createElement('canvas')}){
  const frames=new Map(),visuals=sanitizeVisuals(settings);
  try{
    captureViews((id,frame)=>{
      if(!FOUR_VIEWS.some(view=>view.id===id)||frames.has(id)||!frame?.width||!frame?.height)throw new Error('A captura das quatro vistas ficou incompleta.');
      const copy=makeCanvas();copy.width=frame.width;copy.height=frame.height;
      copy.getContext('2d').drawImage(frame,0,0);const entry={canvas:copy,bounds:null};frames.set(id,entry);entry.bounds=alphaBounds(copy);
    });
    if(frames.size!==4)throw new Error('A captura das quatro vistas ficou incompleta.');
    const entries=FOUR_VIEWS.map(view=>frames.get(view.id)),top=Math.min(...entries.map(frame=>frame.bounds.y)),bottom=Math.max(...entries.map(frame=>frame.bounds.y+frame.bounds.height));
    const height=bottom-top,padding=Math.max(2,Math.round(height*.012)),gap=Math.max(4,Math.round(height*.018));
    const width=entries.reduce((sum,frame)=>sum+frame.bounds.width,0)+gap*3+padding*2;
    const scale=Math.min(1,maxWidth/width);
    target.width=Math.ceil(width*scale);target.height=Math.ceil((height+padding*2)*scale);
    const ctx=target.getContext('2d');ctx.scale(scale,scale);ctx.filter=`contrast(${visuals.contrast/100})`;
    let x=padding;
    for(const {canvas,bounds} of entries){ctx.drawImage(canvas,bounds.x,top,bounds.width,height,x,padding,bounds.width,height);x+=bounds.width+gap;}
    ctx.filter='none';return target;
  }finally{for(const {canvas} of frames.values())canvas.width=canvas.height=1;}
}

function fitText(ctx, text, x, y, maxWidth, size, weight = 500) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  let fitted = clean;
  for (; size > 30; size -= 2) {
    ctx.font = `${weight} ${size}px "Chakra Petch", Arial, sans-serif`;
    if (ctx.measureText(fitted).width <= maxWidth) break;
  }
  while (ctx.measureText(fitted).width > maxWidth && fitted.length > 1) fitted = fitted.slice(0, -2).trimEnd() + '…';
  ctx.fillText(fitted, x, y);
}

function trackedText(ctx, text, x, y, spacing) {
  const chars = [...text];
  const width = chars.reduce((total, char) => total + ctx.measureText(char).width, 0) + Math.max(0, chars.length - 1) * spacing;
  const align = ctx.textAlign; ctx.textAlign = 'left';
  if (align === 'center') x -= width / 2;
  if (align === 'right') x -= width;
  for (const char of chars) { ctx.fillText(char, x, y); x += ctx.measureText(char).width + spacing; }
  ctx.textAlign = align;
}

export function composeFourViewSheet(target, { logo, settings, projectName, designerName, captureViews, outputScale = 1 }) {
  const layout = FOUR_VIEW_SHEET, visuals = sanitizeVisuals(settings);
  if (!logo || (logo.naturalWidth || logo.width) < 250 || (logo.naturalHeight || logo.height) < 100) throw new Error('Não foi possível carregar a logo da apresentação. Tente novamente.');
  const scale=Number.isFinite(outputScale)?Math.min(1,Math.max(.05,outputScale)):1;
  target.width = Math.round(layout.width*scale); target.height = Math.round(layout.height*scale);
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a imagem.');
  ctx.scale(scale,scale);
  paintBackdrop(ctx, layout.width, layout.height, visuals);
  const dark = isDarkBackdrop(visuals), ink = dark ? '#f2f2ed' : '#252a2b', gold = dark ? '#c4ad7d' : '#786544';
  const completed = new Set();
  captureViews((id, frame) => {
    const index = FOUR_VIEWS.findIndex(view => view.id === id);
    if (index < 0 || completed.has(id) || !frame?.width || !frame?.height) throw new Error('Não foi possível capturar as quatro vistas. Tente novamente.');
    ctx.save(); ctx.filter = `contrast(${visuals.contrast / 100})`;
    ctx.drawImage(frame, layout.margin + index * (layout.frameWidth + layout.gap), layout.frameTop, layout.frameWidth, layout.frameHeight);
    ctx.restore(); completed.add(id);
  });
  if (completed.size !== FOUR_VIEWS.length) throw new Error('A apresentação ficou incompleta. Tente novamente.');

  ctx.fillStyle = '#16181a'; ctx.fillRect(0, 0, layout.width, 300); ctx.fillRect(0, 2160, layout.width, 144);
  ctx.fillStyle = '#bba77d'; ctx.fillRect(layout.margin, 299, layout.width - layout.margin * 2, 2);
  // Keep the complete Atlas lockup, including UNIFORM STUDIO, in its native ratio.
  drawBrandLogo(ctx,logo,layout.margin,70,440,160);
  ctx.fillStyle = '#c4ad7d'; ctx.font = '500 23px "Chakra Petch", Arial, sans-serif';
  ctx.textAlign = 'right'; ctx.fillStyle = '#f2f2ed';
  fitText(ctx, projectName || 'Seu uniforme', layout.width - layout.margin, 153, 3060, 64, 700);
  ctx.fillStyle = '#bba77d'; ctx.font = '400 23px "Chakra Petch", Arial, sans-serif';
  trackedText(ctx, 'APRESENTAÇÃO DO UNIFORME · QUATRO VISTAS', layout.width - layout.margin, 218, 3);
  ctx.textAlign = 'center';
  for (const [index, view] of FOUR_VIEWS.entries()) {
    const x = layout.margin + index * (layout.frameWidth + layout.gap) + layout.frameWidth / 2;
    ctx.fillStyle = gold; ctx.fillRect(x - 30, 1978, 60, 3);
    ctx.fillStyle = ink; ctx.font = '500 32px "Chakra Petch", Arial, sans-serif';
    trackedText(ctx, view.label, x, 2047, 3);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#c4ad7d';
  fitText(ctx, designerName && designerName !== '—' ? `Design por ${designerName}` : 'Atlas Uniform Studio', layout.margin, 2245, 2100, 30);
  ctx.textAlign = 'right'; ctx.fillStyle = '#a6aaa6';
  ctx.font = '400 24px "Chakra Petch", Arial, sans-serif';
  ctx.fillText('Laterais identificadas pela vista de frente', layout.width - layout.margin, 2245);
  ctx.textAlign = 'left';
  return target;
}

export function fourViewFilename(projectName = '') {
  const slug = projectName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/g, '');
  return `atlas-${slug || 'uniforme'}-4-vistas.png`;
}
