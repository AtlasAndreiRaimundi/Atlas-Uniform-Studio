import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {paint} from './paint.js';
import {PANELS,inspectGLB} from './core.js';
import {CompatibleRenderer} from './compatible-renderer.js';

export function gridGeometry(fn,nx=48,ny=40) {
 const positions=[],uv=[],indices=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny;positions.push(...fn(u,v));uv.push(u,v);}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,d,a,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function shirtPoint(front,u,v) {
 const t=u*2-1,width=.565+.055*v+.022*Math.sin(v*Math.PI),x=t*width;
 const cut=Math.sqrt(Math.max(0,1-(t/.38)**2));
 const top=1.91-.1*Math.abs(t)-(front?.29:.065)*cut;
 const y=.21+1.7*v-(1.91-top)*v**9;
 const depth=(.065+.19*Math.sqrt(Math.max(0,1-t*t)))*(1-.16*v**6);
 const z=(front?1:-1)*(depth+.006*Math.sin(21*u+v*9)*Math.sin(v*Math.PI));
 return [front?x:-x,y,z];
}
function shortsPoint(front,side,u,v) {
 const outer=.58-.055*v,inner=.055*Math.max(0,1-2*v);
 const x=side*(inner+(outer-inner)*u),y=-.86+.98*v+.02*Math.sin(u*Math.PI);
 const z=(front?1:-1)*(.12+.1*Math.sin(u*Math.PI)+.025*v);
 return [front?x:-x,y,z];
}
export class UniformScene {
 constructor(host,{select,dragStart,dragMove,dragEnd,selection,deferModel=false}={}) {
  this.host=host;this.events={select,dragStart,dragMove,dragEnd,selection};this.textures=new Map();this.meshes=[];this.garment=new THREE.Group();this.trimMeshes=[];this.mode='edit';this.active='front';this.custom=false;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.05,100);this.camera.position.set(0,.65,6.25);
  try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.setClearColor(0,0);}catch{this.renderer=new CompatibleRenderer();this.software=true;}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.domElement.setAttribute('aria-label','Uniforme 3D interativo');host.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.38,0);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;this.controls.minDistance=2.8;this.controls.maxDistance=10;this.controls.maxPolarAngle=Math.PI*.85;this.controls.minPolarAngle=Math.PI*.15;this.controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;
  this.scene.add(new THREE.HemisphereLight(0xffffff,0xbcbcbc,1.5));
  const key=new THREE.DirectionalLight(0xffffff,1.3);key.position.set(3,5,5);this.scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,.8);fill.position.set(-4,2,-3);this.scene.add(fill);
  this.scene.add(this.garment);if(!deferModel)this.makeDefault();
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#24392b55');g.addColorStop(.4,'#24392b22');g.addColorStop(1,'#24392b00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.18;this.scene.add(shadow);this.shadow=shadow;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  const el=this.renderer.domElement;
  el.addEventListener('pointerdown',e=>this.pointerDown(e),true);el.addEventListener('pointermove',e=>this.pointerMove(e),true);el.addEventListener('pointerup',e=>this.pointerUp(e),true);el.addEventListener('pointercancel',e=>this.pointerUp(e),true);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  this.dirty=true;this.controls.addEventListener('change',()=>this.dirty=true);
  this.frame=()=>{this.controls.update();if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}this.animation=requestAnimationFrame(this.frame);};this.frame();
 }
 material(){return new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,side:THREE.DoubleSide});}
 addMesh(id,geo,piece='shirt'){const mesh=new THREE.Mesh(geo,this.material());mesh.userData={panel:id,piece};this.garment.add(mesh);this.meshes.push(mesh);return mesh;}
 makeDefault(){
  this.clearGarment();this.custom=false;
  const nx=this.software?16:48,ny=this.software?20:40;
  this.addMesh('front',gridGeometry((u,v)=>shirtPoint(true,u,v),nx,ny));
  this.addMesh('back',gridGeometry((u,v)=>shirtPoint(false,u,v),nx,ny));
  for(const side of [0,1]){
   const g=gridGeometry((u,v)=>{const f=shirtPoint(true,side,v),b=shirtPoint(false,1-side,v);return [f[0],f[1],f[2]+(b[2]-f[2])*u];},2,ny);
   for(let i=0;i<g.attributes.uv.count;i++)g.attributes.uv.setX(i,side);this.addMesh('front',g);
  }
  for(const [start,end] of [[0,.31],[.69,1]]){
   const g=gridGeometry((u,v)=>{const x=start+(end-start)*u,f=shirtPoint(true,x,1),b=shirtPoint(false,1-x,1);return [f[0],f[1]+(b[1]-f[1])*v,f[2]+(b[2]-f[2])*v];},12,2);
   for(let i=0;i<g.attributes.uv.count;i++){g.attributes.uv.setX(i,start+(end-start)*g.attributes.uv.getX(i));g.attributes.uv.setY(i,1);}this.addMesh('front',g);
  }
  for(const [id,sign] of [['sleeve-right',-1],['sleeve-left',1]]){
   const fn=(u,v)=>{const angle=u*Math.PI*2,r=.205+.045*v,cx=sign*(1.015-.405*v),cy=1.26+.4*v;return [cx+sign*Math.cos(angle)*r*.72,cy+Math.cos(angle)*r*.7,Math.sin(angle)*r];};
   this.addMesh(id,gridGeometry(fn,this.software?24:64,this.software?6:20));
   const hem=new THREE.CatmullRomCurve3(Array.from({length:65},(_,i)=>new THREE.Vector3(...fn(i/64,.03))));
   const cuff=new THREE.Mesh(new THREE.TubeGeometry(hem,this.software?24:64,.012,4,false),this.material());cuff.userData.piece='shirt';this.garment.add(cuff);this.trimMeshes.push(cuff);
  }
  for(const front of [true,false])for(const side of [-1,1]){
   const geo=gridGeometry((u,v)=>shortsPoint(front,side,u,v),this.software?12:48,this.software?10:40);const uv=geo.attributes.uv;
   for(let i=0;i<uv.count;i++){const x=geo.attributes.position.getX(i);uv.setX(i,(front?x:-x)/1.16+.5);}
   this.addMesh(front?'short-front':'short-back',geo,'shorts');
  }
  const neck=[];for(let i=0;i<33;i++){const u=.31+i/32*.38;neck.push(new THREE.Vector3(...shirtPoint(true,u,1)));}for(let i=0;i<33;i++){const u=.31+i/32*.38;neck.push(new THREE.Vector3(...shirtPoint(false,u,1)));}
  const collar=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neck,true),this.software?40:96,.025,this.software?4:8,true),this.material());collar.userData.piece='shirt';this.trimMeshes.push(collar);this.garment.add(collar);
  const bandGeo=gridGeometry((u,v)=>{const a=u*Math.PI*2;return [.53*Math.cos(a),.095+v*.075,.23*Math.sin(a)];},64,2);
  const band=new THREE.Mesh(bandGeo,this.material());band.userData.piece='shorts';this.garment.add(band);this.trimMeshes.push(band);
 }
 clearGarment(){
  this.garment.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map&&!this.textures.has(m.userData?.panel))m.map.dispose();m.dispose();}}});this.garment.clear();this.meshes=[];this.trimMeshes=[];
  for(const t of this.textures.values())t.texture.dispose();this.textures.clear();
 }
 async loadGLB(buffer,{preset=null,presetPanels=[]}={}){
  inspectGLB(buffer);const result=await new GLTFLoader().parseAsync(buffer,'');
  const editable=[];let vertices=0;result.scene.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.uv){editable.push(o);vertices+=o.geometry.attributes.position.count;}});
  if(!editable.length||editable.length>100||vertices>(this.software?12000:900000)){result.scene.traverse(o=>{o.geometry?.dispose();});throw Error(!editable.length?'O modelo não possui painéis com coordenadas UV para desenhar.':this.software?'O modo 3D compatível aceita modelos leves, com até 12 mil vértices. Ative a aceleração gráfica no navegador para modelos maiores.':'Este modelo é pesado demais. Use até 100 painéis e 900 mil vértices.');}
  const box=new THREE.Box3().setFromObject(result.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)throw Error('O modelo não possui dimensões válidas.');
  this.clearGarment();this.custom=!preset;this.preset=preset;
  const wrap=new THREE.Group();wrap.add(result.scene);result.scene.position.sub(center);wrap.scale.setScalar(3.1/size.y);wrap.position.y=.38;this.garment.add(wrap);
  const panels=[];editable.forEach((mesh,i)=>{const association=result.parser.associations.get(mesh);const number=Number(mesh.name.match(/P(\d{2})$/)?.[1]);const meta=preset?(presetPanels.find(p=>p.mesh===association?.meshes)||presetPanels.find(p=>p.number===number)||mesh.userData.labPanel):null;if(preset&&!meta)throw Error('Painel do molde não identificado.');if(meta?.rect){const uv=mesh.geometry.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,(uv.getX(j)*meta.pageSize-meta.rect.x)/meta.rect.w,1-(uv.getY(j)*meta.pageSize-meta.rect.y)/meta.rect.h);uv.needsUpdate=true;}const id=meta?.id??`mesh-${i}`,label=meta?.label??(mesh.name||`Painel ${i+1}`).slice(0,70),piece=meta?.piece??'custom';const old=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of old)m.dispose();mesh.material=this.material();mesh.userData={...mesh.userData,panel:id,piece};this.meshes.push(mesh);panels.push(meta?{...meta}:{id,label,piece,cm:{w:52,h:70}});});
  this.view('front');return panels;
 }
 update(state){
  this.dirty=true;
  this.active=state.active;
  for(const p of state.panels){let entry=this.textures.get(p.id);if(!entry){const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());entry={canvas,texture};this.textures.set(p.id,entry);}const signature=JSON.stringify([p.color,p.layers]);if(entry.signature!==signature){paint(entry.canvas,p);entry.texture.needsUpdate=true;entry.signature=signature;}}
  for(const m of this.meshes){m.visible=state.product==='kit'||state.product==='custom'||m.userData.piece===state.product;const e=this.textures.get(m.userData.panel);if(e){m.material.map=e.texture;m.material.color.set('#ffffff');m.material.needsUpdate=true;}m.material.emissive.set(m.userData.panel===state.active?'#19220a':'#000000');m.material.emissiveIntensity=.045;}
  for(const m of this.trimMeshes){m.visible=state.product==='kit'||m.userData.piece===state.product;m.material.color.set(state.trim);}
 }
 dispose(){cancelAnimationFrame(this.animation);this.observer.disconnect();this.controls.dispose();this.clearGarment();this.renderer.dispose?.();this.renderer.domElement.remove();}
 resize(){const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);this.dirty=true;}
 view(side){const target=new THREE.Vector3(0,.38,0);this.controls.target.copy(target);const sign=this.preset?1:-1;const n={front:[0,.68,6.25],back:[0,.68,-6.25],right:[sign*6.25,.68,0],left:[-sign*6.25,.68,0],angle:[3.4,1.4,5.3]}[side]??[0,.68,6.25];this.camera.position.set(...n);this.camera.lookAt(target);this.controls.update();}
 setMode(mode){this.mode=mode;this.renderer.domElement.style.cursor=mode==='edit'?'grab':'move';}
 capture(){
  const shadowVisible=this.shadow.visible;this.shadow.visible=false;
  try{
  this.renderer.render(this.scene,this.camera);const source=this.renderer.domElement,W=source.width,H=source.height,box=new THREE.Box3();
  for(const mesh of this.meshes.filter(m=>m.visible)){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}
  const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(this.camera));
  const xs=points.map(p=>(p.x*.5+.5)*W),ys=points.map(p=>(-.5*p.y+.5)*H);const padding=H*.055;
  const left=Math.max(0,Math.floor(Math.min(...xs)-padding)),top=Math.max(0,Math.floor(Math.min(...ys)-padding));
  const right=Math.min(W,Math.ceil(Math.max(...xs)+padding)),bottom=Math.min(H,Math.ceil(Math.max(...ys)+padding));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,right-left);canvas.height=Math.max(1,bottom-top);canvas.getContext('2d').drawImage(source,left,top,canvas.width,canvas.height,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');
  }finally{this.shadow.visible=shadowVisible;this.dirty=true;}
 }
 hit(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.meshes.filter(m=>m.visible),false).find(h=>h.uv);}
 pointerDown(e){if(this.mode!=='edit'||e.button!==0)return;const h=this.hit(e);if(!h)return;const p=h.object.userData.panel;const point={x:h.uv.x,y:1-h.uv.y};const l=this.events.selection?.(p,point);if(!l){this.events.select?.(p);return;}if(l.locked)return;this.drag={id:e.pointerId,panel:p,offset:{x:point.x-l.x,y:point.y-l.y}};this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();this.events.dragStart?.();}
 pointerMove(e){if(!this.drag||this.drag.id!==e.pointerId)return;const h=this.hit(e);if(h&&h.object.userData.panel===this.drag.panel)this.events.dragMove?.(h.uv.x-this.drag.offset.x,1-h.uv.y-this.drag.offset.y);e.stopImmediatePropagation();}
 pointerUp(e){if(!this.drag||this.drag.id!==e.pointerId)return;this.drag=null;this.controls.enabled=true;if(this.renderer.domElement.hasPointerCapture(e.pointerId))this.renderer.domElement.releasePointerCapture(e.pointerId);this.events.dragEnd?.();e.stopImmediatePropagation();}
 zoom(delta){this.camera.position.sub(this.controls.target).multiplyScalar(delta).add(this.controls.target);this.controls.update();}
}
