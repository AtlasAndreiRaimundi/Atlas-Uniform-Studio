// Registered GLBs already contain their generated atlas in UV0 and source UVs
// in UV1. Never normalize each panel independently during the art transfer.
export function prepareBakedGeometry(geometry) {
  if (!geometry.attributes.uv || !geometry.attributes.uv1) throw new Error('Este molde está sem o mapa UV registrado.');
  const atlasUv = geometry.attributes.uv.clone(), originalUv = geometry.attributes.uv1.clone(), normalizedUv = originalUv.clone();
  let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
  for(let i=0;i<originalUv.count;i++){minU=Math.min(minU,originalUv.getX(i));maxU=Math.max(maxU,originalUv.getX(i));minV=Math.min(minV,originalUv.getY(i));maxV=Math.max(maxV,originalUv.getY(i));}
  for(let i=0;i<originalUv.count;i++)normalizedUv.setXY(i,(originalUv.getX(i)-minU)/Math.max(maxU-minU,1e-8),(originalUv.getY(i)-minV)/Math.max(maxV-minV,1e-8));
  return {originalUv,atlasUv,normalizedUv};
}
