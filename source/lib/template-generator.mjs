// Deterministic GLB → flat drawing atlas. Runs without a GPU or external service.
// Geometry, indices, normals and original UVs remain intact. Only color UVs are
// translated into non-overlapping rectangles at one common texel scale.
export class TemplateError extends Error {}
const PAGE = 4096;
export const TEMPLATE_LIMITS = Object.freeze({ bytes: 20 * 1024 * 1024, triangles: 200000, vertices: 250000, islands: 128 });
const fail = message => { throw new TemplateError(message); };
const finite = values => values.every(Number.isFinite);
const align = value => Math.ceil(value / 4) * 4;
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const number = value => Number(value.toFixed(3));

export function readGlb(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 28 || bytes.length > TEMPLATE_LIMITS.bytes) fail('Envie um GLB de até 20 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) fail('O arquivo precisa ser um GLB 2.0 válido, com a geometria incorporada.');
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || jsonLength > bytes.length - 28) fail('A estrutura do GLB está incompleta.');
  let json;
  try { json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)).trim()); } catch { fail('Não foi possível ler a estrutura do GLB.'); }
  const start = 20 + jsonLength;
  if (start + 8 > bytes.length || view.getUint32(start + 4, true) !== 0x004e4942) fail('Este arquivo está sem a malha incorporada. Exporte um GLB completo.');
  const binaryLength = view.getUint32(start, true);
  if (start + 8 + binaryLength !== bytes.length || json.buffers?.length !== 1 || json.buffers[0].uri || json.buffers[0].byteLength > binaryLength) fail('Exporte um GLB com todos os recursos incorporados.');
  if (json.asset?.version !== '2.0' || !json.meshes?.length || !json.scenes?.length) fail('O arquivo não contém uma cena 3D válida.');
  if (json.skins?.length || json.animations?.length) fail('Exporte o molde estático, sem esqueleto ou animações.');
  const compressed = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_mesh_quantization'];
  if ((json.extensionsUsed || []).some(e => compressed.includes(e))) fail('Exporte o GLB sem compressão de malha (Draco ou Meshopt).');
  for (const image of json.images || []) if (image.uri && !/^data:image\/(png|jpeg|webp);base64,/i.test(image.uri)) fail('Incorpore as texturas no GLB. Arquivos externos não são aceitos.');
  return { json, binary: bytes.subarray(start + 8, start + 8 + binaryLength) };
}

export function readAccessor(json, binary, index) {
  const a = json.accessors?.[index], sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, sizesByType = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  const buffer = a && json.bufferViews?.[a.bufferView];
  if (!a || !buffer || buffer.buffer !== 0 || a.sparse || !sizes[a.type] || !sizesByType[a.componentType] || !Number.isInteger(a.count) || a.count < 1 || a.count > TEMPLATE_LIMITS.vertices * 6) fail('O GLB usa uma estrutura de vértices não suportada. Exporte uma malha estática com UVs.');
  const size = sizes[a.type], componentBytes = sizesByType[a.componentType], itemBytes = size * componentBytes;
  const offset = (buffer.byteOffset || 0) + (a.byteOffset || 0), stride = buffer.byteStride || itemBytes;
  if (![offset, stride, buffer.byteLength].every(Number.isSafeInteger) || offset < 0 || stride < itemBytes || (a.byteOffset || 0) + (a.count - 1) * stride + itemBytes > buffer.byteLength || offset + (a.count - 1) * stride + itemBytes > binary.length) fail('Os dados de vértices do GLB estão fora dos limites do arquivo.');
  const data = new Float64Array(a.count * size), view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  for (let i = 0; i < a.count; i++) for (let d = 0; d < size; d++) {
    const at = offset + i * stride + d * componentBytes;
    let v = a.componentType === 5126 ? view.getFloat32(at, true) : a.componentType === 5125 ? view.getUint32(at, true) : a.componentType === 5123 ? view.getUint16(at, true) : view.getUint8(at);
    if (a.normalized && a.componentType !== 5126) v /= a.componentType === 5121 ? 255 : a.componentType === 5123 ? 65535 : 4294967295;
    if (!Number.isFinite(v)) fail('O GLB contém coordenadas inválidas.');
    data[i * size + d] = v;
  }
  return { data, count: a.count, size, definition: a };
}

function contours(tris, uv) {
  const edges = new Map();
  for (const tri of tris) for (let i = 0; i < 3; i++) {
    const a = tri[i], b = tri[(i + 1) % 3]; if (a === b) continue;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const edge = edges.get(key);
    if (edge) edge.count++; else edges.set(key, { a, b, count: 1 });
  }
  const adjacent = new Map();
  for (const edge of edges.values()) if (edge.count === 1) {
    if (!adjacent.has(edge.a)) adjacent.set(edge.a, []);
    if (!adjacent.has(edge.b)) adjacent.set(edge.b, []);
    adjacent.get(edge.a).push(edge.b); adjacent.get(edge.b).push(edge.a);
  }
  if (!adjacent.size) fail('Uma das partes está sem contorno UV aberto. Revise a planificação do molde.');
  if ([...adjacent.values()].some(v => v.length !== 2)) fail('Um painel tem contornos UV ambíguos. Separe as ilhas no programa de origem e exporte novamente.');
  const used = new Set(), paths = [];
  for (const start of adjacent.keys()) {
    if (used.has(start)) continue;
    let current = start, previous = -1; const loop = [];
    do {
      if (used.has(current)) fail('O contorno UV de um painel se cruza. Revise o molde antes de continuar.');
      used.add(current); loop.push(uv[current]);
      const next = adjacent.get(current).find(v => v !== previous);
      previous = current; current = next;
    } while (current !== start);
    if (loop.length >= 3) paths.push(loop);
  }
  return paths;
}

function splitPrimitive(json, binary, meshIndex, primitiveIndex) {
  const primitive = json.meshes[meshIndex].primitives[primitiveIndex];
  if (primitive.mode !== undefined && primitive.mode !== 4 || primitive.targets?.length) fail('Use uma malha estática triangulada.');
  if (primitive.attributes?.TEXCOORD_0 === undefined || primitive.attributes?.POSITION === undefined) fail('O molde está sem UVs ou geometria. Exporte do CLO com UV e malha incorporados.');
  if (Object.keys(primitive.attributes).some(k => /^TEXCOORD_[1-9]/.test(k))) fail('Use um único conjunto de UVs de origem (UV0) neste importador.');
  const positions = readAccessor(json, binary, primitive.attributes.POSITION), coordinates = readAccessor(json, binary, primitive.attributes.TEXCOORD_0);
  if (positions.size !== 3 || coordinates.size !== 2 || positions.count !== coordinates.count || positions.count > TEMPLATE_LIMITS.vertices) fail('Os UVs não correspondem aos vértices do molde.');
  if (primitive.indices !== undefined) { const index = json.accessors?.[primitive.indices]; if (!index || index.type !== 'SCALAR' || ![5121,5123,5125].includes(index.componentType) || index.normalized) fail('Os índices da malha são inválidos.'); }
  if (positions.definition.componentType !== 5126 || ![5121,5123,5126].includes(coordinates.definition.componentType)) fail('Exporte posições e UVs sem quantização.');
  const indices = primitive.indices === undefined ? Uint32Array.from({ length: positions.count }, (_, i) => i) : readAccessor(json, binary, primitive.indices).data;
  if (indices.length % 3 || indices.length / 3 > TEMPLATE_LIMITS.triangles) fail('Use uma malha com até 200 mil triângulos.');
  const canonical = new Uint32Array(positions.count), unique = new Map(), uv = [];
  for (let i = 0; i < positions.count; i++) {
    const key = `${positions.data[i*3]},${positions.data[i*3+1]},${positions.data[i*3+2]}|${coordinates.data[i*2]},${coordinates.data[i*2+1]}`;
    if (!unique.has(key)) { unique.set(key, uv.length); uv.push([coordinates.data[i*2], coordinates.data[i*2+1]]); }
    canonical[i] = unique.get(key);
  }
  const parent = Uint32Array.from({ length: uv.length }, (_, i) => i);
  function root(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
  function join(a, b) { const ra = root(a), rb = root(b); if (ra !== rb) parent[rb] = ra; }
  const triangles = [];
  for (let i = 0; i < indices.length; i += 3) {
    const source = [indices[i], indices[i+1], indices[i+2]];
    if (source.some(v => !Number.isInteger(v) || v < 0 || v >= positions.count)) fail('Os índices da malha são inválidos.');
    const tri = source.map(index => canonical[index]);
    join(tri[0], tri[1]); join(tri[1], tri[2]); triangles.push(tri);
  }
  const groups = new Map();
  for (const tri of triangles) { const id = root(tri[0]); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(tri); }
  const islands = [];
  for (const [id, tris] of groups) {
    let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity, area = 0;
    for (const tri of tris) {
      const [a,b,c] = tri.map(index => uv[index]);
      area += Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])) / 2;
      for (const index of tri) { const [u,v] = uv[index]; minU = Math.min(minU,u); maxU = Math.max(maxU,u); minV = Math.min(minV,v); maxV = Math.max(maxV,v); }
    }
    if (area < 1e-12 || maxU-minU < 1e-9 || maxV-minV < 1e-9 || !finite([minU,minV,maxU,maxV]) || Math.max(maxU-minU,maxV-minV) > 1e6) fail('Um dos painéis está sem área UV utilizável.');
    const paths = contours(tris,uv);
    const loopAreas = paths.map(loop => Math.abs(loop.reduce((sum, point, i) => { const next=loop[(i+1)%loop.length]; return sum+point[0]*next[1]-next[0]*point[1]; },0))/2).sort((a,b)=>b-a);
    const coveredArea = loopAreas[0] - loopAreas.slice(1).reduce((sum,area)=>sum+area,0);
    if (Math.abs(area-coveredArea)>Math.max(1e-9,area*1e-4)) fail('Um painel contém UVs sobrepostos ou dobrados. Corrija sua planificação antes de gerar o mapa.');
    islands.push({ root:id, minU,minV,maxU,maxV, width:maxU-minU, height:maxV-minV, paths, meshIndex, primitiveIndex });
  }
  return { primitive, coordinates, canonical, root, islands, triangles:indices.length/3, vertices:positions.count, meshIndex,primitiveIndex };
}

function pack(islands, scale) {
  const shelves = [], placed = new Map(), gap = 56, margin = 100, top = 240, bottom = 110;
  const order = [...islands].sort((a,b) => b.height-a.height || b.width-a.width || a.order-b.order);
  for (const part of order) {
    const w = part.width * scale + gap, h = part.height * scale + gap;
    if (w > PAGE-margin*2 || h > PAGE-top-bottom) return null;
    let shelf = shelves.find(row => row.h >= h && row.x+w <= PAGE-margin);
    if (!shelf) { const y = shelves.length ? shelves.at(-1).y+shelves.at(-1).h : top; if (y+h > PAGE-bottom) return null; shelf={ x:margin,y,h }; shelves.push(shelf); }
    placed.set(part.order,{x:shelf.x,y:shelf.y+gap/2,w:w-gap,h:h-gap}); shelf.x+=w;
  }
  return placed;
}

function makeSvg(name, islands, placed, scale, diagnostic = false) {
  const colors = ['#c6a05e','#4a83af','#bd5f57','#72a183','#986fa6','#c18b4e','#5b9fa4'];
  const drawings=[], guides=[];
  for (const part of islands) {
    const rect=placed.get(part.order), color=colors[part.order%colors.length], label=`PAINEL ${String(part.order+1).padStart(2,'0')}`;
    const d=part.paths.map(loop=>loop.map(([u,v],i)=>`${i?'L':'M'}${number(rect.x+(u-part.minU)*scale)},${number(rect.y+(v-part.minV)*scale)}`).join(' ')+' Z').join(' ');
    drawings.push(`<path id="PAINEL_${part.order+1}" fill="${diagnostic?color:'#ffffff'}" fill-rule="evenodd" ${diagnostic?`stroke="${color}" stroke-width="6"`:''} d="${d}"/>`);
    guides.push(`<path fill="none" stroke="${color}" stroke-width="3" d="${d}"/><text x="${number(rect.x)}" y="${number(rect.y-12)}" font-family="Arial,sans-serif" font-size="23" fill="${color}">${label}</text>`);
    if(diagnostic) drawings.push(`<text x="${number(rect.x+rect.w/2)}" y="${number(rect.y+rect.h/2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.min(100,Math.max(16,rect.h/5))}" fill="#ffffff">${part.order+1}</text>`);
  }
  const title = `<text x="100" y="90" font-family="Arial,sans-serif" font-size="38" font-weight="bold" fill="#272727">${esc(name)}</text><text x="100" y="142" font-family="Arial,sans-serif" font-size="22" fill="#6a6a6a">ATLAS UNIFORM STUDIO · PÁGINA INTEIRA 4096 × 4096 · OCULTE AS GUIAS ANTES DE EXPORTAR</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="4096" viewBox="0 0 4096 4096"><title>${esc(name)} — mapa de desenho</title><g id="FUNDO_MANTER_4096"><rect width="4096" height="4096" fill="#ffffff"/></g><g id="ARTE_DESENHE_AQUI">${drawings.join('')}</g>${diagnostic?'':`<g id="GUIAS_OCULTAR_ANTES_DE_EXPORTAR">${title}${guides.join('')}</g>`}</svg>`;
}

function encodeGlb(json, binary) {
  const encoded = new TextEncoder().encode(JSON.stringify(json)), jsonSize = align(encoded.length), binSize = align(binary.length);
  const out = new Uint8Array(28+jsonSize+binSize), view = new DataView(out.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,out.length,true);view.setUint32(12,jsonSize,true);view.setUint32(16,0x4e4f534a,true);
  out.fill(32,20,20+jsonSize);out.set(encoded,20);view.setUint32(20+jsonSize,binSize,true);view.setUint32(24+jsonSize,0x004e4942,true);out.set(binary,28+jsonSize);return out;
}

export async function generateTemplate(input, options = {}) {
  const source = input instanceof Uint8Array ? input : new Uint8Array(input), {json,binary}=readGlb(source), records=[], islands=[];
  let triangleCount=0,vertexCount=0;
  // Bound peak allocations before building the topology maps in a 128 MB Worker.
  let expectedVertices=0,expectedTriangles=0;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives||[]){
    const count=json.accessors?.[primitive.attributes?.POSITION]?.count||0;
    const elements=primitive.indices===undefined?count:(json.accessors?.[primitive.indices]?.count||0);
    if(!Number.isSafeInteger(count)||!Number.isSafeInteger(elements)||count<0||elements<0)fail('A contagem de vértices do GLB é inválida.');
    expectedVertices+=count;expectedTriangles+=elements/3;
  }
  if(expectedVertices>TEMPLATE_LIMITS.vertices||expectedTriangles>TEMPLATE_LIMITS.triangles)fail('O molde ultrapassa o limite de 200 mil triângulos ou 250 mil vértices.');
  if(source.byteLength*4+expectedVertices*400+expectedTriangles*80>96*1024*1024)fail('Este GLB está muito pesado para gerar o mapa online. Reduza as texturas ou simplifique a malha e envie novamente.');
  for(let m=0;m<json.meshes.length;m++) for(let p=0;p<json.meshes[m].primitives.length;p++) {
    const record=splitPrimitive(json,binary,m,p);triangleCount+=record.triangles;vertexCount+=record.vertices;
    if(triangleCount>TEMPLATE_LIMITS.triangles||vertexCount>TEMPLATE_LIMITS.vertices) fail('O molde ultrapassa o limite de 200 mil triângulos ou 250 mil vértices.');
    records.push(record);for(const island of record.islands){island.order=islands.length;islands.push(island);}
    if(islands.length>TEMPLATE_LIMITS.islands) fail('O molde tem mais de 128 ilhas UV. Una as partes desnecessárias no programa de origem.');
  }
  if(!islands.length) fail('O arquivo não contém painéis com UVs.');
  let low=0,high=PAGE/Math.max(...islands.map(p=>Math.max(p.width,p.height)));
  for(let i=0;i<42;i++){const mid=(low+high)/2;if(pack(islands,mid))low=mid;else high=mid;}
  const scale=low*.995,placed=pack(islands,scale);
  if(!placed||scale<1e-9) fail('Não foi possível organizar os painéis no mapa.');
  let byteLength=align(binary.length);
  const chunks=[];
  for(const record of records) {
    const data=new Float32Array(record.vertices*2),lookup=new Map(record.islands.map(p=>[p.root,p]));
    for(let i=0;i<record.vertices;i++) {
      const island=lookup.get(record.root(record.canonical[i]));if(!island)continue;
      const rect=placed.get(island.order),u=record.coordinates.data[i*2],v=record.coordinates.data[i*2+1];
      data[i*2]=(rect.x+(u-island.minU)*scale)/PAGE;data[i*2+1]=(rect.y+(v-island.minV)*scale)/PAGE;
    }
    const viewIndex=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.byteLength,target:34962});
    const accessorIndex=json.accessors.length;json.accessors.push({bufferView:viewIndex,componentType:5126,count:record.vertices,type:'VEC2'});
    record.primitive.attributes.TEXCOORD_1=record.primitive.attributes.TEXCOORD_0;record.primitive.attributes.TEXCOORD_0=accessorIndex;
    chunks.push({offset:byteLength,data:new Uint8Array(data.buffer)});byteLength+=data.byteLength;
  }
  const outputBinary=new Uint8Array(byteLength);outputBinary.set(binary);for(const chunk of chunks)outputBinary.set(chunk.data,chunk.offset);
  json.buffers[0].byteLength=byteLength;
  json.asset.generator=`${json.asset.generator||'GLB'} · Atlas UV Atlas 1`;
  const sourceHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const name=typeof options.name==='string'?options.name:'Novo molde';
  const descriptor={version:1,kind:'generated',id:options.id||'generated',name,category:options.category||'camiseta',pageSize:PAGE,sourceSha256:sourceHash,orientation:{up:options.up==='z'?'z':'y',front:['+z','-z','+x','-x'].includes(options.front)?options.front:'+z'},triangles:triangleCount,vertices:vertexCount,panelCount:islands.length,
    primitives:records.map(r=>({key:`m${r.meshIndex}p${r.primitiveIndex}`,mesh:r.meshIndex,primitive:r.primitiveIndex,label:json.meshes[r.meshIndex].name||`Parte ${r.meshIndex+1}`,islandCount:r.islands.length})),
    panels:islands.map(p=>({number:p.order+1,mesh:p.meshIndex,primitive:p.primitiveIndex,rect:placed.get(p.order),uvBounds:[p.minU,p.minV,p.maxU,p.maxV],contourVertices:p.paths.reduce((s,path)=>s+path.length,0)})),texelsPerUvUnit:scale};
  return {model:encodeGlb(json,outputBinary),svg:makeSvg(name,islands,placed,scale),proof:makeSvg(name,islands,placed,scale,true),descriptor};
}
