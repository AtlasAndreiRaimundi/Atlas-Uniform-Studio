import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../public/vendor/three/build/three.module.min.js', import.meta.url).href, context);
  return next(specifier, context);
} });
const THREE = await import('three');
const { GLTFLoader } = await import('../public/vendor/three/examples/jsm/loaders/GLTFLoader.js');
const { ATLAS_LAYOUT } = await import('../public/atlas-layout.js');
const { preparePanelGeometry, validateMapDimensions, createAtlasTexture, assignAtlasTexture } = await import('../public/map-atlas.js');
const {useFabricInterior} = await import('../public/fabric-interior.js');

// Geometry tests run without a GPU. Only PNG dimensions are needed for the
// loader's texture objects; these tests do not claim to verify GPU appearance.
globalThis.self = globalThis;
globalThis.ProgressEvent = class { constructor(type, detail) { Object.assign(this, { type }, detail); } };
globalThis.createImageBitmap = async (blob) => {
  const data = Buffer.from(await blob.arrayBuffer());
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), close() {} };
};
const bytes = await readFile(new URL('../public/assets/camiseta.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const meshes = new Map();
gltf.scene.traverse((mesh) => { if (mesh.isMesh) meshes.set(gltf.parser.associations.get(mesh).primitives, mesh); });
const prepared = new Map();
for (const [id, mesh] of meshes) {
  const geometry = mesh.geometry.clone();
  prepared.set(id, { mesh: { geometry }, ...preparePanelGeometry(geometry, ATLAS_LAYOUT.panels[id].rect), artMaterial: new THREE.MeshStandardMaterial() });
}

test('the fixed layout belongs to the exact uploaded model and covers all ten parts', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), ATLAS_LAYOUT.source_sha256);
  assert.equal(meshes.size, 10);
  assert.deepEqual([...meshes.keys()].sort((a, b) => a - b), Object.keys(ATLAS_LAYOUT.panels).map(Number).sort((a, b) => a - b));
});

test('the model atlas coincides with the Corel template outlines, including the sleeves and collar', async () => {
  const svg = await readFile(new URL('../public/assets/template-camiseta.svg', import.meta.url), 'utf8');
  const names = { 2: 'FRENTE', 7: 'COSTAS', 8: 'MANGA_ESQ', 9: 'MANGA_DIR', 6: 'PUNHO_ESQ', 5: 'PUNHO_DIR', 1: 'GOLA_ESQ', 0: 'GOLA_DIR', 4: 'RECORTE_ESQ', 3: 'RECORTE_DIR' };
  let checked = 0;
  for (const [id, name] of Object.entries(names)) {
    const tag = svg.match(new RegExp(`<path[^>]*id="BASE_${name}"[^>]*>`))?.[0];
    assert.ok(tag, `Missing template outline ${name}`);
    const path = tag.match(/\sd="([^"]+)"/)[1];
    const expected = [...path.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const uv = prepared.get(Number(id)).atlasUv;
    for (const point of expected) {
      let minimum = Infinity;
      for (let n = 0; n < uv.count; n++) minimum = Math.min(minimum, Math.hypot(uv.getX(n) * 4096 - point[0], uv.getY(n) * 4096 - point[1]));
      assert.ok(minimum < 0.001, `${name}: ${minimum}px deviation from template`);
      checked++;
    }
  }
  assert.equal(checked, 1739);
});

test('one original image is shared by all ten materials and can be replaced in one operation', () => {
  const firstImage = { width: 4096, height: 4096 };
  const nextImage = { width: 4096, height: 4096 };
  const first = createAtlasTexture(firstImage, 8);
  const next = createAtlasTexture(nextImage, 8);
  assert.equal(first.image, firstImage);
  assert.equal(first.flipY, false);
  assert.equal(first.colorSpace, THREE.SRGBColorSpace);
  assignAtlasTexture(prepared, first);
  for (const p of prepared.values()) assert.equal(p.artMaterial.map, first);
  assignAtlasTexture(prepared, next);
  for (const p of prepared.values()) {
    assert.equal(p.artMaterial.map, next);
    assert.equal(p.artMaterial.map.image, nextImage);
  }
});

test('ESQ and DIR keep the user-defined front-view sides, and fabric UVs remain intact', () => {
  for (const id of [1, 4, 6, 8, 0, 3, 5, 9]) {
    const position = meshes.get(id).geometry.attributes.position;
    let x = 0;
    for (let i = 0; i < position.count; i++) x += position.getX(i);
    assert.ok([1, 4, 6, 8].includes(id) ? x < 0 : x > 0);
  }
  for (const [id, p] of prepared) {
    assert.deepEqual(p.mesh.geometry.attributes.uv1.array, meshes.get(id).geometry.attributes.uv.array);
    for (let i = 0; i < p.atlasUv.count; i++) {
      assert.ok(p.atlasUv.getX(i) >= 0 && p.atlasUv.getX(i) <= 1);
      assert.ok(p.atlasUv.getY(i) >= 0 && p.atlasUv.getY(i) <= 1);
    }
  }
});

test('whole-page exports are accepted and cropped or unsupported image dimensions are rejected', () => {
  assert.doesNotThrow(() => validateMapDimensions(4096, 4096));
  assert.doesNotThrow(() => validateMapDimensions(2048, 2048));
  assert.throws(() => validateMapDimensions(2047, 1716), /página inteira/);
  assert.throws(() => validateMapDimensions(0, 0), /pequena/);
  assert.throws(() => validateMapDimensions(8192, 8192, 4096), /limite/);
});
test('the actual CLO front panel faces outward and its reverse receives the gray interior finish without changing UVs',()=>{
  gltf.scene.updateMatrixWorld(true);const mesh=meshes.get(2),geometry=mesh.geometry,position=geometry.attributes.position.array.slice(),uv=geometry.attributes.uv.array.slice(),index=geometry.index.array.slice(),original=mesh.material;
  const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});useFabricInterior(material);mesh.material=material;
  try{
    const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,0,size.length()*2)),new THREE.Vector3(0,0,-1));
    const outside=ray.intersectObject(mesh,false)[0];assert.ok(outside);const normal=outside.face.normal.clone().transformDirection(mesh.matrixWorld);assert.ok(normal.dot(ray.ray.direction)<0);
    const insideRay=new THREE.Raycaster(outside.point.clone().add(new THREE.Vector3(0,0,-size.length()*.001)),new THREE.Vector3(0,0,1)),inside=insideRay.intersectObject(mesh,false)[0];assert.ok(inside);assert.ok(inside.face.normal.clone().transformDirection(mesh.matrixWorld).dot(insideRay.ray.direction)>0);
    assert.deepEqual(geometry.attributes.position.array,position);assert.deepEqual(geometry.attributes.uv.array,uv);assert.deepEqual(geometry.index.array,index);
  }finally{mesh.material=original;material.dispose();}
});
