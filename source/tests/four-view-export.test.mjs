import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { Box3, PerspectiveCamera, Scene, Vector2, Vector3, Vector4 } from '../public/vendor/three/build/three.module.min.js';
import { FOUR_VIEWS, FOUR_VIEW_SHEET, createFourViewCameras, captureFourViews, composeFourViewSheet, composeTransparentFourViews, fourViewFilename } from '../public/four-view-export.js';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../public/vendor/three/build/three.module.min.js', import.meta.url).href, context);
  return next(specifier, context);
} });
const { GLTFLoader } = await import('../public/vendor/three/examples/jsm/loaders/GLTFLoader.js');
globalThis.self = globalThis;
globalThis.ProgressEvent = class { constructor(type, detail) { Object.assign(this, { type }, detail); } };
globalThis.createImageBitmap = async blob => {
  const data = Buffer.from(await blob.arrayBuffer());
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), close() {} };
};
const bytes = await readFile(new URL('../public/assets/molds/kit-edge-2027-mapa-v3/model.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const originalBounds = new Box3().setFromObject(gltf.scene);

test('four independent cameras retain approved sides and fit the actual CLO model at one scale', () => {
  const models = [
    originalBounds,
    new Box3(new Vector3(-0.4, -1.4, -0.2), new Vector3(0.4, 1.4, 0.2)),
    new Box3(new Vector3(-4, 0, -2), new Vector3(4, 1, 2)),
    new Box3(new Vector3(10, 20, 30), new Vector3(12, 24, 33)),
  ];
  for (const bounds of models) for (const aspect of [930 / 1536, 1, 0.4]) {
    const center = bounds.getCenter(new Vector3());
    const cameras = createFourViewCameras(bounds, { aspect });
    const distances = cameras.map(camera => camera.position.distanceTo(center));
    for (const distance of distances) assert.ok(Math.abs(distance - distances[0]) < 1e-9);
    assert.ok(cameras[0].position.z > center.z, 'front camera must face +Z');
    assert.ok(cameras[1].position.z < center.z, 'back camera must face -Z');
    assert.ok(cameras[2].position.x < center.x, 'ESQ is the -X side in the approved front view');
    assert.ok(cameras[3].position.x > center.x, 'DIR is the +X side in the approved front view');
    for (const camera of cameras) {
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const projected = new Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(projected.x) <= 1 / 1.12 + 1e-9, 'model cropped horizontally');
        assert.ok(Math.abs(projected.y) <= 1 / 1.12 + 1e-9, 'model cropped vertically');
        assert.ok(projected.z > -1 && projected.z < 1, 'model outside depth range');
      }
      assert.ok(camera.matrixWorld.determinant() > 0, 'camera must not mirror the artwork');
    }
  }
});

function rendererFixture(liveCamera, failAt = 0) {
  const state = { size: new Vector2(640, 480), ratio: 1.5, viewport: new Vector4(3, 4, 600, 400), scissor: new Vector4(10, 11, 500, 360), scissorTest: true, target: null, cubeFace: 0, mipLevel: 0 };
  const initial = JSON.stringify(state);
  const calls = [];
  const renderer = {
    domElement: { width: 960, height: 720, style: { filter: 'contrast(1.23)' } },
    getSize: out => out.copy(state.size), getPixelRatio: () => state.ratio,
    getViewport: out => out.copy(state.viewport), getScissor: out => out.copy(state.scissor),
    getScissorTest: () => state.scissorTest, getRenderTarget: () => state.target,
    getActiveCubeFace: () => state.cubeFace, getActiveMipmapLevel: () => state.mipLevel,
    setPixelRatio(value) { state.ratio = value; this.setSize(state.size.x, state.size.y, false); },
    setSize(x, y, style) {
      assert.equal(style, false, 'export must not write inline CSS dimensions');
      state.size.set(x, y); state.viewport.set(0, 0, x, y);
      this.domElement.width = Math.floor(x * state.ratio); this.domElement.height = Math.floor(y * state.ratio);
    },
    setRenderTarget(target, cubeFace = 0, mipLevel = 0) { Object.assign(state, { target, cubeFace, mipLevel }); },
    setViewport(value) { state.viewport.copy(value); }, setScissor(value) { state.scissor.copy(value); },
    setScissorTest(value) { state.scissorTest = value; },
    render(scene, camera) {
      calls.push(camera);
      if (camera !== liveCamera) { assert.equal(state.scissorTest, false); assert.equal(state.ratio, 1); }
      if (calls.length === failAt) throw new Error('simulated GPU failure');
    },
  };
  return { renderer, state, initial, calls };
}

test('capture copies four distinct angles and restores the live renderer without moving its camera', () => {
  const camera = new PerspectiveCamera(32, 1.7, 0.03, 100); camera.position.set(2, 1, 5); camera.lookAt(0.2, 0, 0);
  const before = JSON.stringify(camera.toJSON()), scene = new Scene();
  const { renderer, state, initial, calls } = rendererFixture(camera);
  const copied = [];
  captureFourViews({ renderer, scene, liveCamera: camera, bounds: originalBounds, onCapture(id, canvas) {
    assert.equal(canvas.width, 930); assert.equal(canvas.height, 1536);
    copied.push({ id, camera: calls.at(-1) });
  } });
  assert.deepEqual(copied.map(frame => frame.id), ['front', 'back', 'left', 'right']);
  assert.equal(new Set(copied.map(frame => frame.camera)).size, 4);
  assert.equal(calls.at(-1), camera);
  assert.equal(JSON.stringify(state), initial);
  assert.equal(JSON.stringify(camera.toJSON()), before);
  assert.equal(renderer.domElement.style.filter, 'contrast(1.23)');
  assert.equal(renderer.domElement.width, 960); assert.equal(renderer.domElement.height, 720);
});

test('renderer dimensions and live presentation also recover after capture or rendering fails', () => {
  for (const failAt of [0, 3]) {
    const camera = new PerspectiveCamera(32, 1, 0.03, 100);
    const { renderer, state, initial, calls } = rendererFixture(camera, failAt);
    assert.throws(() => captureFourViews({ renderer, scene: new Scene(), liveCamera: camera, bounds: originalBounds,
      onCapture(id) { if (!failAt && id === 'back') throw new Error('simulated copy failure'); },
    }), /simulated/);
    assert.equal(JSON.stringify(state), initial);
    assert.equal(calls.at(-1), camera);
  }
});

let createCanvas;
try {
  const require = createRequire(import.meta.url);
  ({ createCanvas } = require(require.resolve('@napi-rs/canvas', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] })));
} catch { /* Native Canvas is a QA-only dependency. */ }

function compositionFixture(settings = {}) {
  const logo = createCanvas(250, 100), logoCtx = logo.getContext('2d');
  logoCtx.fillStyle = '#ffffff'; logoCtx.fillRect(0, 24, 250, 42);
  // A bottom marker proves that the complete logo is retained, without the old viewport crop.
  logoCtx.fillStyle = '#ff00ff'; logoCtx.fillRect(0, 70, 250, 14);
  const colors = ['#a05028', '#40a060', '#2850a0', '#d0a040'];
  const frame = createCanvas(10, 10), frameCtx = frame.getContext('2d');
  const copied = [];
  const sheet = composeFourViewSheet(createCanvas(1, 1), {
    logo, settings: { background: 'custom', customColor: '#102030', ...settings },
    projectName: 'Uniforme teste', designerName: 'Andrei Raimundi',
    captureViews(copy) {
      FOUR_VIEWS.forEach((view, i) => {
        frameCtx.clearRect(0, 0, 10, 10); frameCtx.fillStyle = colors[i]; frameCtx.fillRect(3, 3, 4, 4);
        copy(view.id, frame); copied.push(view.id);
      });
    },
  });
  return { sheet, copied };
}

test('PNG sheet has all four copied frames, exact resolution, selected backdrop and complete proportional branding', { skip: !createCanvas }, () => {
  const { sheet, copied } = compositionFixture();
  assert.equal(sheet.width, 4096); assert.equal(sheet.height, 2304);
  assert.equal(copied.length, 4);
  const ctx = sheet.getContext('2d'), layout = FOUR_VIEW_SHEET;
  assert.deepEqual([...ctx.getImageData(10, 1000, 1, 1).data], [16, 32, 48, 255]);
  for (const [i, rgb] of [[160, 80, 40], [64, 160, 96], [40, 80, 160], [208, 160, 64]].entries()) {
    const x = layout.margin + i * (layout.frameWidth + layout.gap) + layout.frameWidth / 2;
    const y = layout.frameTop + layout.frameHeight / 2;
    assert.deepEqual([...ctx.getImageData(x, y, 1, 1).data], [...rgb, 255]);
  }
  assert.deepEqual([...ctx.getImageData(300, 130, 1, 1).data], [255, 255, 255, 255]);
  const pixels = ctx.getImageData(0, 0, sheet.width, sheet.height).data;
  let bottomMarker=false;for (let i = 0; i < pixels.length; i += 4) if(pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 255){bottomMarker=true;break;}assert.ok(bottomMarker,'The lower part of the complete Atlas lockup must be retained');
});

test('sheet contrast affects copied garments once, leaving backdrop and branding intact', { skip: !createCanvas }, () => {
  const { sheet } = compositionFixture({ contrast: 140 });
  const ctx = sheet.getContext('2d'), layout = FOUR_VIEW_SHEET;
  const pixel = [...ctx.getImageData(layout.margin + layout.frameWidth / 2, layout.frameTop + layout.frameHeight / 2, 1, 1).data];
  for (const [i, channel] of [160, 80, 40].entries()) assert.ok(Math.abs(pixel[i] - Math.round((channel - 127.5) * 1.4 + 127.5)) <= 1);
  assert.deepEqual([...ctx.getImageData(10, 1000, 1, 1).data], [16, 32, 48, 255]);
  assert.deepEqual([...ctx.getImageData(300, 130, 1, 1).data], [255, 255, 255, 255]);
});

test('incomplete or repeated views fail instead of downloading a misleading presentation', { skip: !createCanvas }, () => {
  const logo = createCanvas(250, 100), frame = createCanvas(10, 10);
  for (const views of [['front', 'back'], ['front', 'front', 'left', 'right']]) {
    assert.throws(() => composeFourViewSheet(createCanvas(1, 1), { logo, captureViews(copy) { views.forEach(id => copy(id, frame)); } }), /incompleta|capturar/);
  }
});

test('download names identify the project and remain safe across accented names', () => {
  assert.equal(fourViewFilename('C.A.D. — São João / 2026'), 'atlas-c-a-d-sao-joao-2026-4-vistas.png');
  assert.equal(fourViewFilename(), 'atlas-uniforme-4-vistas.png');
});

test('production PNG keeps white fabric and black art opaque, trims by alpha and packs views at one scale',{skip:!createCanvas},()=>{
  const frame=createCanvas(200,300),ctx=frame.getContext('2d'),originals=[];
  const sheet=composeTransparentFourViews(createCanvas(1,1),{makeCanvas:()=>createCanvas(1,1),captureViews(copy){FOUR_VIEWS.forEach((view,i)=>{
    ctx.clearRect(0,0,200,300);ctx.fillStyle=i<2?'#ffffff':'#000000';const width=i<2?100:40;
    ctx.fillRect(100-width/2,30,width,240);originals.push({width,color:i<2?255:0});copy(view.id,frame);
  });}});
  assert.ok(sheet.width<350,'views should use their actual silhouette widths');assert.equal(sheet.height,246);
  const pixels=sheet.getContext('2d').getImageData(0,0,sheet.width,sheet.height).data;
  assert.equal(pixels[3],0);assert.equal(pixels.at(-1),0);
  let opaque=0,white=0,black=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){opaque++;if(pixels[i]===255&&pixels[i+1]===255&&pixels[i+2]===255)white++;if(pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===0)black++;}
  assert.equal(opaque,280*240);assert.equal(white,200*240);assert.equal(black,80*240);
});

test('transparent capture hides only the ground and restores background, objects and renderer after failure',()=>{
  const live=new PerspectiveCamera(32,1,.03,100),scene=new Scene(),background={name:'saved background'},floor={visible:true};scene.background=background;
  const {renderer}=rendererFixture(live);let alpha=1,color=0x123456;
  renderer.getClearColor=out=>out.setHex(color);renderer.getClearAlpha=()=>alpha;renderer.setClearColor=(value,a)=>{color=typeof value==='number'?value:value.getHex();alpha=a;};
  assert.throws(()=>captureFourViews({renderer,scene,liveCamera:live,bounds:originalBounds,transparent:true,hideObjects:[floor],onCapture(){assert.equal(scene.background,null);assert.equal(alpha,0);assert.equal(floor.visible,false);throw new Error('copy failed');}}),/copy failed/);
  assert.equal(scene.background,background);assert.equal(floor.visible,true);assert.equal(alpha,1);assert.equal(color,0x123456);
});
