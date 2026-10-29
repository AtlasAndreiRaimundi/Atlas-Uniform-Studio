// Presentation-only placement: move the whole lower garment, never its panels/UVs.
// Run after orientation and shirt-only filtering, before framing and all exports.
const casualFitMeshes = new WeakSet();
// GLBs use different export scales. Estimate centimetres from a 70 cm shirt body.
const CASUAL_EXTRA_RISE_CM = 10, VISUAL_SHIRT_BODY_CM = 70;
export function alignPresentationKit(root, associations, descriptor, THREE) {
  if (descriptor.fitVersion === 'passeio-v2') return null; // Already fitted and surface-checked in the registered model.
  if (descriptor.kind !== 'generated' || descriptor.category !== 'conjunto') return null;
  root.updateMatrixWorld(true);
  const lower = [], body = [];
  let casual = false;
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    const a = associations.get(mesh), key = `m${a?.meshes ?? 0}p${a?.primitives}`;
    const part = descriptor.primitives?.find(p => p.key === key);
    if (!part || part.decorativeOnly) return;
    const panel = descriptor.panels?.find(p => p.mesh === part.mesh && p.primitive === part.primitive);
    const label = panel?.label || part.label || '';
    if (['CALCAO_E_COS','CALCAO','BERMUDA'].includes(panel?.group) || /cal[cç][aã]o|bermuda|cós|bolso/i.test(label)) {
      lower.push(mesh);
      if (panel?.group === 'BERMUDA' || /bermuda/i.test(label)) casual = true;
    }
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
  // Casual shorts were fitted to the shirt hem width, making their hips and
  // length too large, especially under polos. Scale the complete lower garment
  // uniformly around its waistband; leave standalone shorts and game kits alone.
  let scaleApplied = 1;
  const firstCasualFit = casual && lower.some(mesh => !casualFitMeshes.has(mesh));
  if (firstCasualFit) {
    scaleApplied = .9;
    const pivot = waist.getCenter(new THREE.Vector3()); pivot.y = waist.max.y;
    const fit = new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z)
      .multiply(new THREE.Matrix4().makeScale(scaleApplied,scaleApplied,scaleApplied))
      .multiply(new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));
    // Snapshot world matrices first so transformed parents do not change the fit.
    const targets = lower.filter(mesh => !casualFitMeshes.has(mesh)).map(mesh => ({mesh,world:fit.clone().multiply(mesh.matrixWorld)}));
    for (const {mesh,world} of targets) {
      mesh.parent.updateWorldMatrix(true,false);
      const local = mesh.parent.matrixWorld.clone().invert().multiply(world);
      local.decompose(mesh.position,mesh.quaternion,mesh.scale);
      mesh.updateMatrix(); casualFitMeshes.add(mesh);
    }
    root.updateMatrixWorld(true);
  }
  // Keep naturally fitted kits intact; give loose combinations a small, consistent overlap.
  const overlap = casual ? .11 : .07;
  const baseDelta = gap > -height * (overlap-.001) ? hem + height * overlap - waist.max.y : 0;
  const extraRise = firstCasualFit ? height * CASUAL_EXTRA_RISE_CM / VISUAL_SHIRT_BODY_CM : 0;
  const deltaY = baseDelta + extraRise;
  if (deltaY) {
    for (const mesh of lower) {
      const origin = mesh.getWorldPosition(new THREE.Vector3());
      const localBefore = mesh.parent.worldToLocal(origin.clone());
      const localAfter = mesh.parent.worldToLocal(origin.clone().add(new THREE.Vector3(0, deltaY, 0)));
      mesh.position.add(localAfter.sub(localBefore));
    }
    root.updateMatrixWorld(true);
  }
  return {gapBefore:gap, gapAfter:gap-deltaY, deltaY, bodyHeight:height, movedMeshes:deltaY?lower.length:0, scaleApplied, casual, extraRise};
}
