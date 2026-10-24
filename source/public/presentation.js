export const DEFAULT_VISUALS = Object.freeze({
  brightness: 100, contrast: 100, key: 100, fill: 100, direction: 0,
  background: 'light', customColor: '#eceee7',
});

// One neutral reference for existing projects, client links and captured exports.
// A soft diffuse base keeps the cloth readable without strong incident light.
// User percentages remain relative to this reference.
export const STUDIO_LIGHTING = Object.freeze({
  exposure: 0.9, key: 1.4, fill: 0.9, ambient: 1.8, environment: 0.18, color: 0xffffff,
});

export const VISUAL_RANGES = Object.freeze({
  brightness: [65, 160], contrast: [80, 140], key: [20, 180], fill: [0, 180], direction: [-180, 180],
});

export const LIGHT_PRESETS = Object.freeze({
  standard: { label: 'Natural', brightness: 100, contrast: 100, key: 100, fill: 100, direction: 0 },
  detail: { label: 'Mais detalhes', brightness: 110, contrast: 108, key: 105, fill: 145, direction: 15 },
  dramatic: { label: 'Dramática', brightness: 90, contrast: 118, key: 145, fill: 40, direction: -35 },
});

export const BACKGROUNDS = Object.freeze({
  light: { label: 'Estúdio claro', inner: '#f7f6f1', outer: '#e6e8e3', dark: false },
  dark: { label: 'Estúdio escuro', inner: '#292b2e', outer: '#111315', dark: true },
  gray: { label: 'Cinza neutro', inner: '#d6d8da', outer: '#93999e', dark: false },
  court: { label: 'Quadra', inner: '#293e4c', outer: '#0c1921', dark: true },
});

export function sanitizeVisuals(input = {}) {
  const result = { ...DEFAULT_VISUALS };
  for (const [key, [min, max]] of Object.entries(VISUAL_RANGES)) {
    const raw = input[key];
    const value = raw === null || raw === '' || raw === undefined ? NaN : Number(raw);
    if (Number.isFinite(value)) result[key] = Math.round(Math.min(max, Math.max(min, value)));
  }
  if (input.background === 'custom' || Object.hasOwn(BACKGROUNDS, input.background)) result.background = input.background;
  if (/^#[0-9a-f]{6}$/i.test(input.customColor || '')) result.customColor = input.customColor.toLowerCase();
  return result;
}

export function isDarkBackdrop(settings) {
  const s = sanitizeVisuals(settings);
  if (s.background !== 'custom') return BACKGROUNDS[s.background].dark;
  const rgb = [1, 3, 5].map((i) => parseInt(s.customColor.slice(i, i + 2), 16) / 255);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 0.5;
}

export function applyLighting(renderer, lights, settings, scene) {
  const s = sanitizeVisuals(settings);
  // Three uses Scene.environmentIntensity for scene-supplied environment maps,
  // overriding material.envMapIntensity. Set the actual IBL source as well.
  if (scene) scene.environmentIntensity = STUDIO_LIGHTING.environment;
  if (lights.ambient) lights.ambient.intensity = STUDIO_LIGHTING.ambient;
  if (renderer) {
    renderer.toneMappingExposure = STUDIO_LIGHTING.exposure * s.brightness / 100;
    if (renderer.domElement?.style) renderer.domElement.style.filter = `contrast(${s.contrast / 100})`;
  }
  const angle = s.direction * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  if (lights.key) {
    lights.key.intensity = STUDIO_LIGHTING.key * s.key / 100;
    lights.key.position.set(-3.5 * cos + 4.5 * sin, 5, 3.5 * sin + 4.5 * cos);
  }
  if (lights.fill) {
    lights.fill.intensity = STUDIO_LIGHTING.fill * s.fill / 100;
    lights.fill.position.set(4 * cos - 2 * sin, 1, -4 * sin - 2 * cos);
  }
}

export function paintBackdrop(ctx, width, height, settings) {
  const s = sanitizeVisuals(settings);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (s.background === 'custom') {
    ctx.fillStyle = s.customColor; ctx.fillRect(0, 0, width, height); ctx.restore(); return;
  }
  const palette = BACKGROUNDS[s.background];
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, Math.max(width, height) * 0.85);
  gradient.addColorStop(0, palette.inner); gradient.addColorStop(1, palette.outer);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  if (s.background === 'court') {
    // A simple sports backdrop, independent of the garment and its artwork.
    const horizon = height * 0.72;
    ctx.fillStyle = '#47616b18';
    ctx.beginPath(); ctx.moveTo(width * 0.33, horizon); ctx.lineTo(width * 0.67, horizon);
    ctx.lineTo(width * 1.35, height); ctx.lineTo(-width * 0.35, height); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a4babe28'; ctx.lineWidth = Math.max(1, width / 750);
    ctx.beginPath();
    ctx.moveTo(width * 0.33, horizon); ctx.lineTo(-width * 0.35, height);
    ctx.moveTo(width * 0.67, horizon); ctx.lineTo(width * 1.35, height);
    ctx.moveTo(width * 0.33, horizon); ctx.lineTo(width * 0.67, horizon);
    ctx.moveTo(-width * 0.05, height * 0.88); ctx.lineTo(width * 1.05, height * 0.88);
    ctx.ellipse(width * 0.5, height * 0.88, width * 0.14, height * 0.035, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const x of [0.17, 0.83]) {
      const beam = ctx.createLinearGradient(0, 0, 0, height * 0.65);
      beam.addColorStop(0, '#c9e0e718'); beam.addColorStop(1, '#c9e0e700');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(width * x, 0);
      ctx.lineTo(width * (x + 0.15), height * 0.65); ctx.lineTo(width * (x - 0.15), height * 0.65); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

export function composeSnapshot(target, backdrop, garment, settings) {
  const s = sanitizeVisuals(settings);
  target.width = garment.width; target.height = garment.height;
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a imagem.');
  ctx.drawImage(backdrop, 0, 0, target.width, target.height);
  ctx.save(); ctx.filter = `contrast(${s.contrast / 100})`;
  ctx.drawImage(garment, 0, 0, target.width, target.height); ctx.restore();
  return target;
}
