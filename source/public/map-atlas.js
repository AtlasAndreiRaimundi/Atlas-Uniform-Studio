import * as THREE from 'three';

export function validateMapDimensions(width, height, maximum = 16384) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16) {
    throw new Error('A imagem está vazia ou é pequena demais. Exporte o mapa completo do template.');
  }
  if (width !== height) {
    throw new Error('Este molde usa um mapa quadrado. Exporte a página inteira do template em 4096 × 4096 pixels.');
  }
  if (width > maximum || height > maximum) {
    throw new Error(`O limite deste navegador é ${maximum.toLocaleString('pt-BR')} pixels por lado. Exporte o template em 4096 × 4096 pixels.`);
  }
}

export function preparePanelGeometry(geometry, region) {
  if (!geometry.attributes.uv || !region) throw new Error('O modelo não corresponde ao template desta camiseta.');
  const originalUv = geometry.attributes.uv.clone();
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (let i = 0; i < originalUv.count; i++) {
    minU = Math.min(minU, originalUv.getX(i)); maxU = Math.max(maxU, originalUv.getX(i));
    minV = Math.min(minV, originalUv.getY(i)); maxV = Math.max(maxV, originalUv.getY(i));
  }
  const normalizedUv = originalUv.clone();
  const atlasUv = originalUv.clone();
  for (let i = 0; i < originalUv.count; i++) {
    const u = (originalUv.getX(i) - minU) / Math.max(maxU - minU, 1e-8);
    const v = (originalUv.getY(i) - minV) / Math.max(maxV - minV, 1e-8);
    normalizedUv.setXY(i, u, v);
    atlasUv.setXY(i, region.x + u * region.w, region.y + v * region.h);
  }
  geometry.setAttribute('uv1', originalUv.clone());
  return { originalUv, normalizedUv, atlasUv };
}

export function createAtlasTexture(image, anisotropy = 1) {
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function assignAtlasTexture(panels, texture) {
  for (const p of panels.values()) {
    p.artMaterial.map = texture;
    p.artMaterial.needsUpdate = true;
  }
}
