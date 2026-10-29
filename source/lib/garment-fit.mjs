import {Vector3,Ray} from '../public/vendor/three/build/three.module.min.js';
// Check the lower garment against the shirt's actual horizontal surface envelope.
// Samples include vertices, triangle centroids and edge midpoints in the overlap.
export function inspectGarmentFit(upper,lower,center,clearance=.002){
 const floor=Math.min(...upper.map(p=>Math.min(...p.positions.filter((_,i)=>i%3===1))));
 let ceiling=-Infinity;for(const p of lower)for(let i=1;i<p.positions.length;i+=3)ceiling=Math.max(ceiling,p.positions[i]);
 const triangles=[];
 for(const part of upper)for(let i=0;i<part.indices.length;i+=3){
  const points=[0,1,2].map(k=>new Vector3().fromArray(part.positions,part.indices[i+k]*3));
  const min=Math.min(...points.map(p=>p.y)),max=Math.max(...points.map(p=>p.y));
  if(max>=floor&&min<=ceiling)triangles.push({points,min,max});
 }
 const ray=new Ray(),origin=new Vector3(),dir=new Vector3(),hit=new Vector3();let samples=0,coveredSamples=0,penetrations=0,maxPenetration=0;
 function check(p){
  if(p.y<floor||p.y>ceiling)return;
  const radius=Math.hypot(p.x-center.x,p.z-center.z);if(radius<1e-8)return;samples++;
  ray.set(origin.set(center.x,p.y,center.z),dir.set(p.x-center.x,0,p.z-center.z).normalize());
  let surface=Infinity;
  for(const t of triangles){if(p.y<t.min-1e-7||p.y>t.max+1e-7)continue;if(ray.intersectTriangle(...t.points,false,hit))surface=Math.min(surface,hit.distanceTo(origin));}
  if(!Number.isFinite(surface))return;coveredSamples++;
  const penetration=radius+clearance-surface;if(penetration>1e-5){penetrations++;maxPenetration=Math.max(maxPenetration,penetration);}
 }
 for(const part of lower){
  for(let i=0;i<part.positions.length;i+=3)check(new Vector3().fromArray(part.positions,i));
  for(let i=0;i<part.indices.length;i+=3){const [a,b,c]=[0,1,2].map(k=>new Vector3().fromArray(part.positions,part.indices[i+k]*3));if(Math.max(a.y,b.y,c.y)<floor)continue;check(a.clone().add(b).add(c).multiplyScalar(1/3));check(a.clone().add(b).multiplyScalar(.5));check(b.clone().add(c).multiplyScalar(.5));check(c.clone().add(a).multiplyScalar(.5));}
 }
 return {samples,coveredSamples,penetrations,maxPenetration,clearance};
}
export function placeGarment(parts,scale,center,baseY,anchorY){return parts.map(p=>({...p,positions:Float32Array.from(p.positions,(v,i)=>i%3===0?(v-center.x)*scale:i%3===1?(v-anchorY)*scale+baseY:(v-center.z)*scale)}));}
