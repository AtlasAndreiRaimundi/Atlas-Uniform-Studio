import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { DirectionalLight, HemisphereLight, Scene } from '../public/vendor/three/build/three.module.min.js';
import { DEFAULT_VISUALS, STUDIO_LIGHTING, LIGHT_PRESETS, sanitizeVisuals, isDarkBackdrop, applyLighting, paintBackdrop, composeSnapshot } from '../public/presentation.js';

test('the standard presentation reduces overexposure with a neutral reference and preserves light positions', () => {
  const renderer = { domElement: { style: {} } };
  const lights = { key: new DirectionalLight(), fill: new DirectionalLight() };
  applyLighting(renderer, lights, DEFAULT_VISUALS);
  assert.equal(renderer.toneMappingExposure, 0.9);
  assert.equal(renderer.domElement.style.filter, 'contrast(1)');
  assert.equal(lights.key.intensity, 1.4);
  assert.equal(lights.fill.intensity, 0.9);
  assert.equal(STUDIO_LIGHTING.color,0xffffff);
  assert.ok(STUDIO_LIGHTING.ambient<2.3);assert.ok(STUDIO_LIGHTING.environment<.45);
  assert.deepEqual(lights.key.position.toArray(), [-3.5, 5, 4.5]);
  assert.deepEqual(lights.fill.position.toArray(), [4, 1, -2]);
});

test('brightness, contrast, intensity and rotation reach the actual scene controls', () => {
  const renderer = { domElement: { style: {} } };
  const lights = { key: new DirectionalLight(), fill: new DirectionalLight() };
  applyLighting(renderer, lights, { brightness: 150, contrast: 120, key: 130, fill: 50, direction: 90 });
  assert.equal(renderer.toneMappingExposure, 1.35);
  assert.equal(renderer.domElement.style.filter, 'contrast(1.2)');
  assert.ok(Math.abs(lights.key.intensity - 1.82) < 1e-12);
  assert.equal(lights.fill.intensity, 0.45);
  assert.ok(Math.abs(lights.key.position.x - 4.5) < 1e-12);
  assert.ok(Math.abs(lights.key.position.z - 3.5) < 1e-12);
});

test('the actual scene environment is subdued on initial load, saved projects and reset, while manual brightness still works',()=>{
  const scene=new Scene(),renderer={domElement:{style:{}}},lights={key:new DirectionalLight(),fill:new DirectionalLight(),ambient:new HemisphereLight()};
  assert.equal(scene.environmentIntensity,1,'Three starts with full-strength environment lighting');
  const saved={...DEFAULT_VISUALS,brightness:150,key:160,fill:120,direction:35},original=structuredClone(saved);
  applyLighting(renderer,lights,saved,scene);
  assert.equal(scene.environmentIntensity,.18,'scene-provided IBL must not override the reduced reflection strength');assert.equal(lights.ambient.intensity,1.8);
  const boosted={exposure:renderer.toneMappingExposure,key:lights.key.intensity};assert.ok(boosted.exposure>STUDIO_LIGHTING.exposure);assert.ok(boosted.key>STUDIO_LIGHTING.key);assert.deepEqual(saved,original,'existing slider settings are preserved');
  scene.environmentIntensity=1;applyLighting(renderer,lights,LIGHT_PRESETS.standard,scene);assert.equal(scene.environmentIntensity,.18);assert.ok(renderer.toneMappingExposure<boosted.exposure);assert.ok(lights.key.intensity<boosted.key);assert.equal(renderer.domElement.style.filter,'contrast(1)');
});

test('presets are bounded and invalid saved settings return to safe display values', () => {
  for (const preset of Object.values(LIGHT_PRESETS)) {
    const clean = sanitizeVisuals(preset);
    for (const key of ['brightness', 'contrast', 'key', 'fill', 'direction']) assert.equal(clean[key], preset[key]);
  }
  const clean = sanitizeVisuals({ brightness: Infinity, contrast: -10, key: 900, fill: null, direction: 999, background: 'missing', customColor: 'invalid' });
  assert.deepEqual(clean, { ...DEFAULT_VISUALS, contrast: 80, key: 180, direction: 180 });
  assert.equal(isDarkBackdrop({ background: 'dark' }), true);
  assert.equal(isDarkBackdrop({ background: 'gray' }), false);
  assert.equal(isDarkBackdrop({ background: 'custom', customColor: '#000000' }), true);
  assert.equal(isDarkBackdrop({ background: 'custom', customColor: '#ffffff' }), false);
});

// Pixel checks use an optional native Canvas implementation. It is available in
// the Codex runtime and is not a production or browser dependency of this app.
let createCanvas;
try {
  const require = createRequire(import.meta.url);
  const paths = [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()];
  createCanvas = require(require.resolve('@napi-rs/canvas', { paths })).createCanvas;
} catch { /* The portable light and atlas checks still run without native Canvas. */ }

test('every backdrop fills an opaque frame and custom colors remain exact', { skip: !createCanvas }, () => {
  const canvas = createCanvas(160, 100), ctx = canvas.getContext('2d');
  for (const background of ['light', 'dark', 'gray', 'court']) {
    paintBackdrop(ctx, 160, 100, { background });
    const pixels = ctx.getImageData(0, 0, 160, 100).data;
    for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
  }
  paintBackdrop(ctx, 160, 100, { background: 'custom', customColor: '#102030' });
  assert.deepEqual([...ctx.getImageData(5, 5, 1, 1).data], [16, 32, 48, 255]);
});

test('export includes the selected backdrop and contrast while leaving the source art intact', { skip: !createCanvas }, () => {
  const backdrop = createCanvas(30, 30);
  paintBackdrop(backdrop.getContext('2d'), 30, 30, { background: 'custom', customColor: '#102030' });
  const garment = createCanvas(30, 30), ctx = garment.getContext('2d');
  ctx.fillStyle = 'rgb(160,80,40)'; ctx.fillRect(10, 10, 10, 10);
  const source = Buffer.from(ctx.getImageData(0, 0, 30, 30).data);
  const standard = composeSnapshot(createCanvas(1, 1), backdrop, garment, DEFAULT_VISUALS);
  assert.deepEqual([...standard.getContext('2d').getImageData(0, 0, 1, 1).data], [16, 32, 48, 255]);
  assert.deepEqual([...standard.getContext('2d').getImageData(15, 15, 1, 1).data], [160, 80, 40, 255]);
  const contrast = composeSnapshot(createCanvas(1, 1), backdrop, garment, { contrast: 140 });
  const pixel = [...contrast.getContext('2d').getImageData(15, 15, 1, 1).data];
  assert.ok(pixel[0] > 160 && pixel[1] < 80 && pixel[2] < 40);
  assert.deepEqual([...contrast.getContext('2d').getImageData(0, 0, 1, 1).data], [16, 32, 48, 255]);
  assert.deepEqual(Buffer.from(ctx.getImageData(0, 0, 30, 30).data), source);
});
