// A small textured triangle renderer for browsers without a WebGL context.
// It uses the same geometry, UVs and camera as the accelerated view.
import * as THREE from 'three';
export class CompatibleRenderer {
 constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.pixelRatio=1;this.capabilities={getMaxAnisotropy:()=>1};}
 setPixelRatio(ratio){this.pixelRatio=Math.min(1.5,ratio);}
 setSize(w,h){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.pixelRatio);this.domElement.height=Math.round(h*this.pixelRatio);}
 render(scene,camera){
  const ctx=this.ctx,W=this.domElement.width,H=this.domElement.height;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);scene.updateMatrixWorld();camera.updateMatrixWorld();const triangles=[];
  scene.traverseVisible(mesh=>{
   if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
   const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,idx=g.index,material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
   const points=new Array(p.count);for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(camera);points[i]={x:(v.x*.5+.5)*W,y:(-.5*v.y+.5)*H,z:v.z};}
   const n=idx?idx.count:p.count;for(let k=0;k<n;k+=3){const ids=[0,1,2].map(j=>idx?idx.getX(k+j):k+j),q=ids.map(i=>points[i]);if(q.some(v=>!v||v.z<-1||v.z>1))continue;
    const area=(q[1].x-q[0].x)*(q[2].y-q[0].y)-(q[1].y-q[0].y)*(q[2].x-q[0].x);if(Math.abs(area)<.08)continue;
    const a=new THREE.Vector3().fromBufferAttribute(p,ids[0]).applyMatrix4(mesh.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(p,ids[1]).applyMatrix4(mesh.matrixWorld),c=new THREE.Vector3().fromBufferAttribute(p,ids[2]).applyMatrix4(mesh.matrixWorld);
    const normal=b.sub(a).cross(c.sub(a)).normalize(),brightness=.8+.2*Math.abs(normal.dot(new THREE.Vector3(.3,.6,1).normalize()));
    const image=material.map?.image,coords=uv&&image?ids.map(i=>({x:uv.getX(i)*image.width,y:(1-uv.getY(i))*image.height})):null;
    triangles.push({q,coords,image,depth:(q[0].z+q[1].z+q[2].z)/3,color:'#'+material.color.getHexString(),opacity:material.opacity??1,shade:material.isMeshBasicMaterial?0:1-brightness});
   }
  });
  triangles.sort((a,b)=>b.depth-a.depth);
  for(const t of triangles){
   const {q}=t,cx=(q[0].x+q[1].x+q[2].x)/3,cy=(q[0].y+q[1].y+q[2].y)/3;
   const expanded=q.map(p=>{const d=Math.hypot(p.x-cx,p.y-cy)||1;return {x:p.x+(p.x-cx)/d*.48,y:p.y+(p.y-cy)/d*.48};});
   ctx.save();ctx.beginPath();ctx.moveTo(expanded[0].x,expanded[0].y);ctx.lineTo(expanded[1].x,expanded[1].y);ctx.lineTo(expanded[2].x,expanded[2].y);ctx.closePath();ctx.clip();ctx.globalAlpha=t.opacity;
   if(t.image&&t.coords){const [a,b,c]=t.coords,det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(det)>.00001){
     const A=((q[1].x-q[0].x)*(c.y-a.y)-(q[2].x-q[0].x)*(b.y-a.y))/det;
     const C=((q[2].x-q[0].x)*(b.x-a.x)-(q[1].x-q[0].x)*(c.x-a.x))/det;
     const B=((q[1].y-q[0].y)*(c.y-a.y)-(q[2].y-q[0].y)*(b.y-a.y))/det;
     const D=((q[2].y-q[0].y)*(b.x-a.x)-(q[1].y-q[0].y)*(c.x-a.x))/det;
     ctx.setTransform(A,B,C,D,q[0].x-A*a.x-C*a.y,q[0].y-B*a.x-D*a.y);ctx.drawImage(t.image,0,0);ctx.setTransform(1,0,0,1,0,0);
    }}else{ctx.fillStyle=t.color;ctx.fillRect(0,0,W,H);}
   if(t.shade){ctx.globalAlpha=t.shade*t.opacity;ctx.fillStyle='#0b221a';ctx.fillRect(0,0,W,H);}ctx.restore();
  }
 }
}
