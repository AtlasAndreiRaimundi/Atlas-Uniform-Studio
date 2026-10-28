// Presentation-only placement: move the whole lower garment, never its panels/UVs.
// Run after orientation and shirt-only filtering, before framing and all exports.
export function alignPresentationKit(root, associations, descriptor, THREE) {
  if (descriptor.kind !== 'generated' || descriptor.category !== 'conjunto') return null;
  root.updateMatrixWorld(true);
  const lower = [], body = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    const a = associations.get(mesh), key = `m${a?.meshes ?? 0}p${a?.primitives}`;
    const part = descriptor.primitives?.find(p => p.key === key);
    if (!part || part.decorativeOnly) return;
    const panel = descriptor.panels?.find(p => p.mesh === part.mesh && p.primitive === part.primitive);
    const label = panel?.label || part.label || '';
    if (['CALCAO_E_COS','CALCAO','BERMUDA'].includes(panel?.group) || /cal[cç][aã]o|bermuda|cós|bolso/i.test(label)) lower.push(mesh);
    else if (/^(frente|costas)(\b|$)/i.test(label)) body.push({mesh,box:new THREE.Box3().setFromObject(mesh)});
  });
  if (!lower.length || !body.length) return null;
  const torso = body.reduce((box, b) => box.union(b.box), new THREE.Box3());
  const waist = lower.reduce((box, mesh) => box.union(new THREE.Box3().setFromObject(mesh)), new THREE.Box3());
  const height = torso.max.y - torso.min.y;
  // Curved hems may have low corners while the centre is still far above the
  // waistband. Sample the lower silhouette across the central torso width.
  const hems = body.map(({mesh,box}) => {
    const bins=Array(20).fill(Infinity), width=box.max.x-box.min.x, v=new THREE.Vector3();
    if(width<=0)return box.min.y;
    const pos=mesh.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
      const bin=Math.min(19,Math.max(0,Math.floor((v.x-box.min.x)/width*20)));
      bins[bin]=Math.min(bins[bin],v.y);
    }
    const central=bins.slice(4,16).filter(Number.isFinite).sort((a,b)=>a-b);
    return central.length?central[Math.floor((central.length-1)*.75)]:box.min.y;
  });
  const hem = Math.max(...hems);
  const gap = hem - waist.max.y;
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(gap)) return null;
  // Keep naturally fitted kits intact; give loose combinations a small, consistent overlap.
  const deltaY = gap > -height * .069 ? hem + height * .07 - waist.max.y : 0;
  if (deltaY) {
    for (const mesh of lower) {
      const origin = mesh.getWorldPosition(new THREE.Vector3());
      const localBefore = mesh.parent.worldToLocal(origin.clone());
      const localAfter = mesh.parent.worldToLocal(origin.clone().add(new THREE.Vector3(0, deltaY, 0)));
      mesh.position.add(localAfter.sub(localBefore));
    }
    root.updateMatrixWorld(true);
  }
  return {gapBefore:gap, gapAfter:gap-deltaY, deltaY, bodyHeight:height, movedMeshes:deltaY?lower.length:0};
}
