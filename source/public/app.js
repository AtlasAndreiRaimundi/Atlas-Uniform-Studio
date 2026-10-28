import { BUILTIN_TEMPLATE } from './template-catalog.js';
import { prepareBakedGeometry, selectPresentationGarments, presentationPanelNumber } from './model-panels.js?v=3';
import { createProjectSession } from './project-session.js?v=12';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ATLAS_LAYOUT } from './atlas-layout.js';
import { preparePanelGeometry, validateMapDimensions, createAtlasTexture, assignAtlasTexture } from './map-atlas.js';
import { DEFAULT_VISUALS, STUDIO_LIGHTING, LIGHT_PRESETS, VISUAL_RANGES, sanitizeVisuals, isDarkBackdrop, applyLighting, paintBackdrop, composeSnapshot } from './presentation.js?v=3';
import { fourViewFilename } from './four-view-export.js?v=3';
import {cleanPresentation,cleanCamera} from './presentation-contract.js';
import {createDeliveryTools} from './delivery-tools.js?v=8';
import {captureProductionSheet,renderExportImage,createVideoPreview,asBlob} from './export-package.js?v=4';
import {useFabricInterior} from './fabric-interior.js?v=2';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const PANEL_INFO = [
  { id: 2, label: 'Frente', short: 'FRENTE', color: '#deae61', view: 'front' },
  { id: 7, label: 'Costas', short: 'COSTAS', color: '#65a492', view: 'back' },
  { id: 8, label: 'Manga ESQ · vista de frente', short: 'ESQ', color: '#d05b50', view: 'left' },
  { id: 9, label: 'Manga DIR · vista de frente', short: 'DIR', color: '#416ba0', view: 'right' },
  { id: 6, label: 'Punho ESQ', short: 'ESQ', color: '#cc473b', view: 'left' },
  { id: 5, label: 'Punho DIR', short: 'DIR', color: '#315c93', view: 'right' },
  { id: 1, label: 'Gola frontal ESQ', short: 'ESQ', color: '#d05b50', view: 'front' },
  { id: 0, label: 'Gola frontal DIR', short: 'DIR', color: '#416ba0', view: 'front' },
  { id: 4, label: 'Recorte lateral ESQ', short: 'ESQ', color: '#d05b50', view: 'left' },
  { id: 3, label: 'Recorte lateral DIR', short: 'DIR', color: '#416ba0', view: 'right' },
];
const panels = new Map();
let sourceImage = null;
let atlasTexture = null;
let sourceObjectUrl = null;
let mapRequest = 0;
let currentMode = 'white';
let renderer, scene, camera, controls, modelRoot, floor;
let resizeObserver, animationId;
let stageWidth = 1, stageHeight = 1;
let cameraTween = null;
let ready = false,exportInProgress=false;
let renderFailed = false;
let fitDistance = 5.3;
let modelHeight = 2.8;
let modelWidth = 2.15;
let templateConfig = { ...BUILTIN_TEMPLATE };
let visualSettings = { ...DEFAULT_VISUALS, background: 'dark' };
const lighting = { key: null, fill: null, ambient: null };
let toastTimer;
let projectSession = null;
let exportAssets = null;
let latestDownloadUrl=null;
let presentationSettings=cleanPresentation(),deliveryTools,pickArmed=false,activeAnchor=null,pointerStart=null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}

function redrawBackdrop() {
  const canvas = $('#backdropCanvas');
  const rect = $('#stage').getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, 2);
  const width = renderer?.domElement.width || Math.max(1, Math.round(rect.width * ratio));
  const height = renderer?.domElement.height || Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  paintBackdrop(canvas.getContext('2d'), width, height, visualSettings);
}

function applyVisualState() {
  visualSettings = sanitizeVisuals(visualSettings);
  applyLighting(renderer, lighting, visualSettings, scene);
  const dark = isDarkBackdrop(visualSettings);
  $('.viewer').classList.toggle('dark', dark);
  if (floor) floor.material.opacity = dark ? 0.24 : 0.12;
  if (projectSession?.readOnly) $('#modeCaption').textContent = 'Arraste para explorar cada detalhe.';
  for (const input of $$('[data-visual]')) {
    const key = input.dataset.visual;
    input.value = visualSettings[key];
    const [min, max] = VISUAL_RANGES[key];
    input.style.setProperty('--range-fill', `${(visualSettings[key] - min) / (max - min) * 100}%`);
    $(`#${key}Value`).textContent = `${visualSettings[key]}${key === 'direction' ? '°' : '%'}`;
  }
  for (const button of $$('.light-preset')) {
    const preset = LIGHT_PRESETS[button.dataset.light];
    const active = Object.keys(VISUAL_RANGES).every((key) => visualSettings[key] === preset[key]);
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  for (const button of $$('.scene-button')) {
    const active = button.dataset.bg === visualSettings.background;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  $('#customBgColor').value = visualSettings.customColor;
  $('.custom-bg-row').classList.toggle('active', visualSettings.background === 'custom');
  redrawBackdrop();
  deliveryTools?.refreshPreview();
}

function showError(error) {
  renderFailed = true;
  if(projectSession?.proposalToken)window.parent.postMessage({type:'meinerz:unavailable',versionId:projectSession.versionId},location.origin);
  console.error(error);
  $('#loading').hidden = true;
  $('#stageError').hidden = false;
  $('#errorMessage').textContent = 'Verifique sua conexão e se o navegador está com aceleração gráfica disponível. ' + (error?.message || '');
  $('#readyLabel').innerHTML = '<i></i>FALHA AO CARREGAR';
  updateMapStatus();
}

function neutralMaterial(original) {
  const normal = original.normalMap?.clone() || null;
  if (normal) { normal.channel = 1; normal.needsUpdate = true; }
  const m = new THREE.MeshStandardMaterial({
    color: 0xf1f2ec, roughness: 0.98, metalness: 0,
    side: THREE.DoubleSide, normalMap: normal,
  });
  if (original.normalScale) m.normalScale.copy(original.normalScale).multiplyScalar(0.6);
  m.envMapIntensity = STUDIO_LIGHTING.environment;
  return m;
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function makeProof(info) {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = info.color; ctx.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if ((x + y) % 2 === 0) { ctx.fillStyle = '#ffffff16'; ctx.fillRect(x * 128, y * 128, 128, 128); }
  }
  ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 1024); ctx.moveTo(0, i * 128); ctx.lineTo(1024, i * 128); ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${info.short.length > 4 ? 138 : 210}px Arial`;
  ctx.fillText(info.short, 512, 580);
  ctx.font = '500 35px Arial'; ctx.fillText('TOPO ↑', 512, 185);
  ctx.font = '500 25px Arial'; ctx.fillText('CONFERÊNCIA DE PAINEL', 512, 715);
  return { canvas: c, texture: makeCanvasTexture(c) };
}

function applyMode(mode) {
  if (mode === 'art' && !atlasTexture) return;
  currentMode = mode;
  for (const p of panels.values()) {
    const showArt = mode === 'art' && atlasTexture;
    p.mesh.geometry.setAttribute('uv', showArt ? p.atlasUv : mode === 'proof' ? p.normalizedUv : p.originalUv);
    p.mesh.material = mode === 'original' ? p.originalMaterial : mode === 'proof' ? p.proofMaterial : showArt ? p.artMaterial : p.whiteMaterial;
  }
  $$('.material-button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  const caption = { original: 'Geometria e materiais originais do arquivo', white: 'Geometria original · apresentação neutra', proof: 'Grade de conferência · ESQ / DIR pela vista de frente', art: ready ? 'Mapa completo aplicado · posições do template preservadas' : 'Mapa completo carregado' };
  $('#modeCaption').textContent = projectSession?.readOnly ? 'Arraste para explorar cada detalhe.' : caption[mode];
  $('#materialHint').textContent = mode === 'proof' ? 'Vermelho = ESQ. Azul = DIR. Os dois lados seguem a vista de frente do mapa.' : 'O mesmo molde em todos os ângulos.';
}

async function init3D() {
  const stage = $('#stage');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = STUDIO_LIGHTING.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Modelo 3D da peça. Arraste para girar e use dois dedos para dar zoom.');
  renderer.domElement.tabIndex = 0;
  stage.append(renderer.domElement);
  scene = new THREE.Scene();
  scene.environmentIntensity = STUDIO_LIGHTING.environment;
  camera = new THREE.PerspectiveCamera(32, 1, 0.03, 100);
  camera.position.set(0, 0.1, fitDistance);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = true; controls.minDistance = .18; controls.maxDistance = 20;
  controls.minPolarAngle = Math.PI * 0.12; controls.maxPolarAngle = Math.PI * 0.85;
  controls.autoRotateSpeed = 1.3;
  controls.addEventListener('start', () => { cameraTween = null;activeAnchor=null;$('#piecePin').hidden=true; $$('.view-button').forEach((b) => b.classList.remove('active')); });
  renderer.domElement.addEventListener('pointerdown',event=>{pointerStart=[event.clientX,event.clientY];});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!pickArmed||!pointerStart||Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>8)return;
    const rect=renderer.domElement.getBoundingClientRect(),point=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(point,camera);
    const hit=ray.intersectObjects([...panels.values()].map(p=>p.mesh),false)[0];if(!hit)return toast('Toque diretamente na peça para marcar a região.');
    const anchor={point:hit.point.toArray(),panel:hit.object.name,camera:getCamera()};activeAnchor=anchor;armPick(false);
    window.parent.postMessage({type:'meinerz:anchor',versionId:projectSession.versionId,anchor},location.origin);positionPin();
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose(); pmrem.dispose();
  const ambient = new THREE.HemisphereLight(STUDIO_LIGHTING.color, STUDIO_LIGHTING.color, STUDIO_LIGHTING.ambient);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(STUDIO_LIGHTING.color, STUDIO_LIGHTING.key);
  key.position.set(-3.5, 5, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.normalBias = 0.025; key.shadow.bias = -0.0002;
  scene.add(key);
  const fill = new THREE.DirectionalLight(STUDIO_LIGHTING.color, STUDIO_LIGHTING.fill); fill.position.set(4, 1, -2); scene.add(fill);
  lighting.key = key; lighting.fill = fill; lighting.ambient = ambient;
  floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.ShadowMaterial({ opacity: 0.12, color: 0x223321 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.65; floor.receiveShadow = true; scene.add(floor);
  resizeStage(); applyVisualState();
  await loadPresentationModel();
  animate();
}

async function loadPresentationModel(prefetched) {
  const loader = new GLTFLoader();
  const gltf = prefetched || await loader.loadAsync(templateConfig.modelUrl, (e) => {
    if (e.total) $('#loadProgress').textContent = `Carregando ${Math.round(e.loaded / e.total * 100)}%`;
  });
  modelRoot = gltf.scene;
  selectPresentationGarments(modelRoot, gltf.parser.associations, templateConfig);
  if (templateConfig.kind === 'generated') {
    const vertical = new THREE.Group(); vertical.add(modelRoot);
    if (templateConfig.orientation?.up === 'z') vertical.rotation.x = -Math.PI / 2;
    modelRoot = new THREE.Group(); modelRoot.add(vertical);
    modelRoot.rotation.y = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 }[templateConfig.orientation?.front || '+z'];
  }
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y < 0.001) throw new Error('O arquivo está sem geometria 3D utilizável.');
  const scale = modelHeight / size.y;
  modelWidth = templateConfig.kind === 'builtin' ? 2.15 : Math.max(size.x, size.z) * scale;
  modelRoot.scale.setScalar(scale);
  modelRoot.position.copy(center).multiplyScalar(-scale);
  scene.add(modelRoot);
  modelRoot.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const association = gltf.parser.associations.get(mesh);
    const builtin = templateConfig.kind === 'builtin';
    const id = builtin ? association?.primitives : `m${association?.meshes ?? 0}p${association?.primitives}`;
    const entry = !builtin && templateConfig.primitives.find(p => p.key === id);
    // Buttons and stitching keep their geometry but never receive the drawing atlas.
    if (entry?.decorativeOnly) {
      if (!mesh.geometry.attributes.position) throw new Error('Detalhe do molde sem geometria.');
      mesh.material = neutralMaterial(mesh.material);
      useFabricInterior(mesh.material);
      mesh.castShadow = true; mesh.receiveShadow = false;
      return;
    }
    const partNumber = !builtin ? presentationPanelNumber(templateConfig,entry) : 0;
    const info = builtin ? PANEL_INFO.find(p => p.id === id) : entry ? { label: entry.displayName || `Parte ${partNumber}`, short: String(partNumber), color: ['#c6a05e','#4a83af','#bd5f57','#72a183'][partNumber % 4] } : null;
    if (!info || !mesh.geometry.attributes.position || !mesh.geometry.attributes.uv) throw new Error('Os painéis do modelo não correspondem a este molde.');
    mesh.name = info.label;
    mesh.geometry = mesh.geometry.clone();
    const uv = builtin ? preparePanelGeometry(mesh.geometry, ATLAS_LAYOUT.panels[id]?.rect) : prepareBakedGeometry(mesh.geometry);
    const whiteMaterial = neutralMaterial(mesh.material);
    const proof = makeProof(info);
    const proofMaterial = whiteMaterial.clone(); proofMaterial.map = proof.texture; proofMaterial.color.set(0xffffff);
    const artMaterial = whiteMaterial.clone(); artMaterial.color.set(0xffffff); artMaterial.map = atlasTexture;
    for(const material of [mesh.material,whiteMaterial,proofMaterial,artMaterial])useFabricInterior(material);
    mesh.castShadow = true; mesh.receiveShadow = false;
    panels.set(builtin ? id : `${id}:${mesh.uuid}`, { mesh, originalMaterial: mesh.material, ...uv, whiteMaterial, proofMaterial, proof, artMaterial });
  });
  if (!panels.size || (templateConfig.kind === 'builtin' && panels.size !== 10)) throw new Error('Os painéis não correspondem ao molde selecionado.');
  ready = true;
  if (atlasTexture) {
    atlasTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    atlasTexture.needsUpdate = true;
    assignAtlasTexture(panels, atlasTexture);
  }
  applyMode(sourceImage ? 'art' : currentMode);
  updateMapStatus();
  resizeStage(); setView('front', true);if(presentationSettings.camera)setCamera(presentationSettings.camera);
  $('#loading').hidden = true;
  $('#readyLabel').innerHTML = '<i></i>MODELO CARREGADO';
  $('#screenshotBtn').disabled = false;
  $('#exportFourViewsBtn').disabled = false;
  deliveryTools?.refreshPreview();
}

function resizeStage() {
  if(exportInProgress)return;
  const rect = $('#stage').getBoundingClientRect();
  stageWidth = Math.max(1, rect.width); stageHeight = Math.max(1, rect.height);
  if (!renderer) { redrawBackdrop(); return; }
  renderer.setSize(stageWidth, stageHeight, false);
  redrawBackdrop();
  camera.aspect = stageWidth / stageHeight; camera.updateProjectionMatrix();
  const relativeZoom=ready&&fitDistance>0?camera.position.distanceTo(controls.target)/fitDistance:1;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const fitHeight = modelHeight * 1.3 / (2 * Math.tan(verticalFov / 2));
  const fitWidth = modelWidth * 1.22 / (2 * Math.tan(verticalFov / 2) * camera.aspect);
  fitDistance = Math.max(fitHeight, fitWidth);
  if (ready) {
    const direction = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, fitDistance*relativeZoom);
    controls.update();
  }
}

function setView(view, instant = false) {
  if (!ready) return;
  controls.autoRotate = false; $('#autoRotate').checked = false; $('#clientRotateBtn').setAttribute('aria-pressed', 'false');
  const directions = { front: new THREE.Vector3(0, 0.12, 1), back: new THREE.Vector3(0, 0.12, -1), left: new THREE.Vector3(-1, 0.12, 0), right: new THREE.Vector3(1, 0.12, 0) };
  const target = new THREE.Vector3(0, 0.04, 0);
  const to = directions[view].normalize().multiplyScalar(fitDistance).add(target);
  if (instant || reducedMotion) { camera.position.copy(to); controls.target.copy(target); controls.update(); }
  else {
    const fromSphere = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const toSphere = new THREE.Spherical().setFromVector3(to.clone().sub(target));
    const deltaTheta = THREE.MathUtils.euclideanModulo(toSphere.theta - fromSphere.theta + Math.PI, Math.PI * 2) - Math.PI;
    cameraTween = { start: performance.now(), fromSphere, toSphere, deltaTheta, targetFrom: controls.target.clone(), target };
  }
  $$('.view-button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
}

let lastTime = performance.now();
function animate(time = performance.now()) {
  animationId = requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1); lastTime = time;
  if(exportInProgress)return;
  if (cameraTween) {
    const p = Math.min(1, (time - cameraTween.start) / 550);
    const ease = 1 - Math.pow(1 - p, 3);
    controls.target.lerpVectors(cameraTween.targetFrom, cameraTween.target, ease);
    const spherical = new THREE.Spherical(
      THREE.MathUtils.lerp(cameraTween.fromSphere.radius, cameraTween.toSphere.radius, ease),
      THREE.MathUtils.lerp(cameraTween.fromSphere.phi, cameraTween.toSphere.phi, ease),
      cameraTween.fromSphere.theta + cameraTween.deltaTheta * ease,
    );
    camera.position.setFromSpherical(spherical).add(controls.target);
    if (p === 1) cameraTween = null;
  }
  controls.update(dt); renderer.render(scene, camera);
  if(activeAnchor)positionPin();
}

function selectTab(tab) {
  $$('.sidebar-tab').forEach((b) => { const active = b.dataset.tab === tab; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active)); });
  $('#presentationPanel').hidden = tab !== 'presentation'; $('#artPanel').hidden = tab !== 'art';
  $('#deliveryPanel').hidden=tab!=='delivery';
}

function updateMapStatus() {
  if (!sourceImage) return;
  $('#mapStatus').classList.add('has-map');
  $('#mapStatusTitle').textContent = ready ? 'Aplicado à peça inteira' : 'Mapa completo carregado';
  $('#mapStatusText').textContent = ready
    ? 'Todas as partes usam as posições do template deste molde.'
    : renderFailed ? 'O mapa foi lido. A visualização 3D está indisponível neste navegador.'
    : 'A aplicação será concluída assim que o modelo 3D terminar de carregar.';
}

async function loadFullMap(url, filename, objectUrl = false) {
  const request = ++mapRequest;
  let accepted = false;
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (request !== mapRequest) return;
    validateMapDimensions(image.naturalWidth, image.naturalHeight, renderer?.capabilities.maxTextureSize || 16384);
    const texture = createAtlasTexture(image, Math.min(renderer?.capabilities.getMaxAnisotropy() || 1, 8));
    const previousTexture = atlasTexture;
    const previousUrl = sourceObjectUrl;
    sourceImage = image; atlasTexture = texture; sourceObjectUrl = objectUrl ? url : null;
    assignAtlasTexture(panels, texture);
    $('#mapPreview').src = url;
    $('#mapPreview').alt = `Mapa 2D completo: ${filename}`;
    $('#mapPreviewWrap').hidden = false;
    $('#mapDimensions').textContent = `${image.naturalWidth} × ${image.naturalHeight} px`;
    $('#mapFileName').textContent = filename;
    $('#mapFileLabel').textContent = 'Trocar mapa completo';
    $('#artModeBtn').disabled = false;
    applyMode('art'); updateMapStatus();
    previousTexture?.dispose();
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    accepted = true;
    toast(ready ? 'Mapa completo aplicado à peça.' : 'Mapa completo carregado.');
  } catch (error) {
    if (request === mapRequest) toast(error.message || 'Não foi possível ler o mapa.');
  } finally {
    if (objectUrl && !accepted) URL.revokeObjectURL(url);
  }
  return accepted;
}

function download(blob, name) {
  if(latestDownloadUrl)URL.revokeObjectURL(latestDownloadUrl);
  const url = latestDownloadUrl=URL.createObjectURL(blob),fallback=$('#deliveryDownload');fallback.href=url;fallback.download=name;fallback.textContent=`Baixar arquivo gerado ↓ · ${name}`;fallback.hidden=false;
  const a = document.createElement('a'); a.href = url; a.download = name;document.body.append(a); a.click();a.remove();
}

function getCamera(){return camera&&controls?{position:camera.position.toArray(),target:controls.target.toArray()}:presentationSettings.camera;}
function setCamera(value){const saved=cleanCamera(value);if(!saved||!ready)return;cameraTween=null;controls.autoRotate=false;$('#autoRotate').checked=false;$('#clientRotateBtn').setAttribute('aria-pressed','false');controls.target.fromArray(saved.target);camera.position.fromArray(saved.position);controls.update();renderer.render(scene,camera);}
function getPresentation(){return cleanPresentation({...presentationSettings,camera:getCamera()});}
function setPresentation(value){presentationSettings=cleanPresentation(value);if(ready&&presentationSettings.camera)setCamera(presentationSettings.camera);$('#sheetLayout').value=presentationSettings.layout;$('#exportFourViewsBtn').title='Baixar quatro vistas próximas em PNG transparente para o pedido';const host=$('#clientDetailButtons');host.replaceChildren();presentationSettings.details.forEach(detail=>{const b=document.createElement('button');b.type='button';b.textContent=detail.name;b.addEventListener('click',()=>setCamera(detail.camera));host.append(b);});}
function armPick(value){if(!projectSession?.proposalToken||!ready)return;pickArmed=value;controls.enabled=!value;$('#pickInstruction').hidden=!value;renderer.domElement.style.cursor=value?'crosshair':'';}
function positionPin(){if(!activeAnchor||!camera||!renderer)return;const point=new THREE.Vector3(...activeAnchor.point).project(camera),rect=renderer.domElement.getBoundingClientRect(),pin=$('#piecePin');pin.hidden=Math.abs(point.x)>1||Math.abs(point.y)>1||point.z>1||point.z< -1;if(!pin.hidden){pin.style.left=`${rect.left+(point.x+1)*rect.width/2}px`;pin.style.top=`${rect.top+(1-point.y)*rect.height/2}px`;}}
function focusAnchor(anchor){if(!anchor?.camera)return;setCamera(anchor.camera);activeAnchor=anchor;positionPin();}
async function getExportAssets(){exportAssets ||= Promise.all([new Promise((resolve,reject)=>{const logo=new Image();logo.onload=()=>resolve(logo);logo.onerror=()=>reject(new Error('Não foi possível carregar a logo.'));logo.src='/assets/atlas/atlas-logo-light.png';}),document.fonts.load('400 32px "Chakra Petch"'),document.fonts.load('500 32px "Chakra Petch"'),document.fonts.load('700 64px "Chakra Petch"')]).catch(error=>{exportAssets=null;throw error;});return exportAssets;}

$$('.view-button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$$('.material-button').forEach((b) => b.addEventListener('click', () => applyMode(b.dataset.mode)));
$$('.sidebar-tab').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));
$('#resetBtn').addEventListener('click', () => setView('front'));
$('#retryBtn').addEventListener('click', () => location.reload());
$('#autoRotate').addEventListener('change', (e) => { if (controls) { cameraTween = null; controls.autoRotate = e.target.checked; } if (e.target.checked) $$('.view-button').forEach((b) => b.classList.remove('active')); });
$$('.scene-button').forEach((b) => b.addEventListener('click', () => {
  visualSettings.background = b.dataset.bg; applyVisualState();
}));
$$('[data-visual]').forEach((input) => input.addEventListener('input', () => {
  visualSettings[input.dataset.visual] = Number(input.value); applyVisualState();
}));
$$('.light-preset').forEach((b) => b.addEventListener('click', () => {
  visualSettings = { ...visualSettings, ...LIGHT_PRESETS[b.dataset.light] }; applyVisualState();
}));
$('#customBgColor').addEventListener('input', (e) => {
  visualSettings.customColor = e.target.value; visualSettings.background = 'custom'; applyVisualState();
});
$('#resetVisualBtn').addEventListener('click', () => {
  visualSettings = { ...DEFAULT_VISUALS }; applyVisualState(); toast('Iluminação e fundo restaurados.');
});
$('#presentBtn').addEventListener('click', () => {
  const active = document.body.classList.toggle('presenting');
  $('#presentBtn span').textContent = active ? 'Voltar ao estúdio' : 'Apresentar';
  $('#presentBtn').setAttribute('aria-pressed', String(active));
  if (innerWidth <= 760) scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
});
$('#screenshotBtn').addEventListener('click', async () => {
  if (!ready) return;
  $('#screenshotBtn').disabled = true;
  try {
    controls.autoRotate = false; $('#autoRotate').checked = false;
    renderer.render(scene, camera);
    const output = composeSnapshot(document.createElement('canvas'), $('#backdropCanvas'), renderer.domElement, visualSettings);
    const blob = await new Promise((resolve) => output.toBlob(resolve, 'image/png'));
    if (blob) { download(blob, 'atlas-apresentacao.png'); toast('Imagem salva com o fundo e os ajustes de visualização.'); }
    else toast('Não foi possível salvar a imagem. Tente novamente.');
  } catch (error) { toast(error.message || 'Não foi possível salvar a imagem.'); }
  finally { $('#screenshotBtn').disabled = false; }
});
$('#exportFourViewsBtn').addEventListener('click', async () => {
  if (!ready || renderFailed || projectSession.readOnly) return;
  const button = $('#exportFourViewsBtn'), label = button.querySelector('span');
  button.disabled = true; button.setAttribute('aria-busy', 'true'); label.textContent = 'Gerando…';
  let output;
  try {
    toast('Preparando frente, costas e as duas laterais…');
    exportAssets ||= Promise.all([
      new Promise((resolve, reject) => {
        const logo = new Image();
        logo.onload = () => resolve(logo);
        logo.onerror = () => reject(new Error('Não foi possível carregar a logo. Tente novamente.'));
        logo.src = '/assets/atlas/atlas-logo-light.png';
      }),
      document.fonts.load('400 32px "Chakra Petch"'),
      document.fonts.load('500 32px "Chakra Petch"'),
      document.fonts.load('700 64px "Chakra Petch"'),
    ]).catch(error => { exportAssets = null; throw error; });
    const [logo] = await exportAssets;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const projectName = $('#projectNameInput').value.trim() || $('#projectHeading').textContent;
    const context=await viewerApi.exportContext();try{output=captureProductionSheet(context);}finally{context.restore();}
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Não foi possível salvar a imagem. Tente novamente.');
    download(blob, fourViewFilename(projectName));
    toast('PNG transparente gerado com as quatro vistas próximas, pronto para anexar ao pedido.');
  } catch (error) { toast(error.message || 'Não foi possível exportar as quatro vistas. Tente novamente.'); }
  finally {
    if (output) output.width = output.height = 1;
    button.disabled = !ready || renderFailed; button.removeAttribute('aria-busy'); label.textContent = '4 vistas';
  }
});
$('.upload-area').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#mapInput').click(); } });
$('#mapInput').addEventListener('change', async (event) => {
  if (projectSession.readOnly) return;
  const file = event.target.files?.[0]; if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Envie uma imagem PNG, JPG ou WebP.'); event.target.value = ''; return; }
  if (file.size > 20 * 1024 * 1024) { toast('Use uma imagem de até 20 MB.'); event.target.value = ''; return; }
  try { if (await loadFullMap(URL.createObjectURL(file), file.name, true)) projectSession.mapChanged(file); }
  finally { event.target.value = ''; }
});
$('#exampleMapBtn').addEventListener('click', async () => {
  if (projectSession.readOnly || !templateConfig.proofUrl) return;
  $('#exampleMapBtn').disabled = true;
  try {
    if (await loadFullMap(templateConfig.proofUrl, 'Mapa de conferência do molde')) {
      // This is a generated diagnostic map. Real uploaded artwork is never redrawn.
      const canvas = document.createElement('canvas'); canvas.width = sourceImage.naturalWidth; canvas.height = sourceImage.naturalHeight;
      canvas.getContext('2d').drawImage(sourceImage, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Não foi possível preparar o exemplo.');
      projectSession.mapChanged(new File([blob], 'Mapa-conferencia.png', { type: 'image/png' }));
    }
  } catch (error) { toast(error.message); }
  finally { $('#exampleMapBtn').disabled = false; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('presenting')) $('#presentBtn').click(); });
const viewerApi={
  toast, loadMap: loadFullMap,
  configureTemplate: (template) => {
    templateConfig = template;
    $('#moldNameBadge').textContent = template.name.toUpperCase();
    if (template.templateUrl) { $('#templateDownload').href = template.templateUrl; $('#templateDownload').download = `Template_${template.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_4096.svg`; }
    $('#templateDownload').hidden = !template.templateUrl;
    $('#exampleMapBtn').hidden = !template.proofUrl;
    $('#mapStatusText').textContent = `Use a página inteira do template de ${template.name}, em 4096 × 4096 pixels.`;
  },
  canSwitchTemplate:()=>ready&&!exportInProgress&&!renderFailed,
  replaceTemplate:async(template,keepArt=false)=>{
    if(!ready||exportInProgress)throw new Error('Aguarde o carregamento ou a exportação terminar.');
    const gltf=await new GLTFLoader().loadAsync(template.modelUrl);
    const oldRoot=modelRoot,oldPanels=new Map(panels),oldTemplate=templateConfig,oldArt={image:sourceImage,texture:atlasTexture,url:sourceObjectUrl,mode:currentMode},oldPresentation=presentationSettings;
    ready=false;$('#loading').hidden=false;panels.clear();scene.remove(oldRoot);
    try {
      viewerApi.configureTemplate(template);
      if(!keepArt){mapRequest++;sourceImage=null;atlasTexture=null;sourceObjectUrl=null;currentMode='white';setPresentation({...presentationSettings,camera:null,details:[]});}
      await loadPresentationModel(gltf);
      if(!keepArt){oldArt.texture?.dispose();if(oldArt.url)URL.revokeObjectURL(oldArt.url);$('#mapInput').value='';applyMode('white');updateMapStatus();deliveryTools?.refreshPreview();}
      const geometries=new Set(),materials=new Set(),textures=new Set();
      for(const p of oldPanels.values()){geometries.add(p.mesh.geometry);for(const m of [p.originalMaterial,p.whiteMaterial,p.proofMaterial,p.artMaterial]){materials.add(m);if(m?.normalMap)textures.add(m.normalMap);}if(p.proof?.texture)textures.add(p.proof.texture);}
      oldRoot.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);materials.add(m.material);}});
      for(const g of geometries)g.dispose();for(const m of materials)m?.dispose();for(const t of textures)t.dispose();
      return true;
    }catch(error){if(modelRoot!==oldRoot)scene.remove(modelRoot);modelRoot=oldRoot;panels.clear();for(const [key,p]of oldPanels)panels.set(key,p);scene.add(oldRoot);viewerApi.configureTemplate(oldTemplate);sourceImage=oldArt.image;atlasTexture=oldArt.texture;sourceObjectUrl=oldArt.url;currentMode=oldArt.mode;presentationSettings=oldPresentation;ready=true;setPresentation(oldPresentation);applyMode(oldArt.mode);$('#loading').hidden=true;throw error;}
  },
  getVisuals: () => ({ ...visualSettings }),
  setVisuals: (value) => { visualSettings = sanitizeVisuals(value); applyVisualState(); },
  getCamera,setCamera,getPresentation,setPresentation,focusAnchor,download,
  openDelivery:()=>deliveryTools?.openExport('link'),
  openClientTools:()=>selectTab('delivery'),
  applyPreset:(preset)=>{const details=presentationSettings.details;visualSettings=sanitizeVisuals(preset.visuals);applyVisualState();setPresentation({...preset.presentation,details});if(!preset.presentation?.camera)setView('front',true);},
  isReady:()=>ready&&!renderFailed,
  hasMap:()=>Boolean(sourceImage),
  previewVideo:async(options)=>{const context=await viewerApi.exportContext();let canvas;try{const project=projectSession.getProject();canvas=createVideoPreview({...context,name:project?.name||'Seu uniforme',designerName:$('#designerName').textContent},options);return await asBlob(canvas);}finally{context.restore();if(canvas)canvas.width=canvas.height=1;}},
  previewExport:async(format,options)=>{let canvas;const context=await viewerApi.exportContext();try{const project=projectSession.getProject();canvas=renderExportImage(context,{name:project?.name||'Seu uniforme',designerName:$('#designerName').textContent,version:project?.version||''},{...options,format,preview:true});}finally{context.restore();}try{return await asBlob(canvas);}finally{canvas.width=canvas.height=1;}},
  exportContext:async()=>{if(!ready||renderFailed)throw new Error('Aguarde o modelo 3D carregar.');const [logo]=await getExportAssets();if(exportInProgress)throw new Error('Aguarde a exportação em andamento.');const previousMode=currentMode,previousControls=controls.enabled;let restored=false;exportInProgress=true;controls.enabled=false;cameraTween=null;applyMode('art');return {renderer,scene,liveCamera:camera,bounds:new THREE.Box3().setFromObject(modelRoot),settings:{...visualSettings},logo,productionHidden:[floor],layout:presentationSettings.layout,details:presentationSettings.details.map(d=>({...d})),restore:()=>{if(restored)return;restored=true;exportInProgress=false;controls.enabled=previousControls;applyMode(previousMode);const rect=$('#stage').getBoundingClientRect();if(Math.abs(rect.width-stageWidth)>1||Math.abs(rect.height-stageHeight)>1)resizeStage();}};},
  importMap:async(file)=>loadFullMap(URL.createObjectURL(file),file.name,true),
  rotate: (value) => { if (controls) { cameraTween = null; controls.autoRotate = value; } $('#autoRotate').checked=value;$('#clientRotateBtn').setAttribute('aria-pressed',String(value)); },
  thumbnail: async () => {
    if (!ready || !renderer) return null;
    const context=await viewerApi.exportContext();let thumb;
    try{thumb=captureProductionSheet(context,{scale:.5,maxWidth:1400});return await asBlob(thumb,'image/png');}
    finally{context.restore();if(thumb)thumb.width=thumb.height=1;}
  },
};
projectSession = createProjectSession(viewerApi);
deliveryTools=createDeliveryTools(viewerApi,projectSession);
window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin||!projectSession.proposalToken)return;const message=event.data;if(message?.type==='meinerz:pick')armPick(message.enabled===true);else if(message?.type==='meinerz:focus'&&message.versionId===projectSession.versionId)focusAnchor(message.anchor);});
$$('[data-visual]').forEach(input => input.addEventListener('input', projectSession.changed));
$$('.scene-button, .light-preset, #resetVisualBtn').forEach(button => button.addEventListener('click', projectSession.changed));
$('#customBgColor').addEventListener('input', projectSession.changed);
resizeObserver = new ResizeObserver(resizeStage); resizeObserver.observe($('#stage'));
applyVisualState();
projectSession.ready.then(async opened => {if(opened){await init3D();if(projectSession.proposalToken)window.parent.postMessage({type:'meinerz:ready',versionId:projectSession.versionId},location.origin);}}).catch(showError);
