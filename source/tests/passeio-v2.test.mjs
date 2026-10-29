import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{Vector3}from'../public/vendor/three/build/three.module.min.js';
import{COMPOSED_PASSEIO_V2_TEMPLATES as kits}from'../lib/composed-passeio-v2-templates.mjs';
import{INSTALLED_TEMPLATES}from'../lib/installed-templates.mjs';import{readGlb,readAccessor}from'../lib/template-generator.mjs';
import{inspectGarmentFit}from'../lib/garment-fit.mjs';import{isWithdrawnTemplate}from'../lib/withdrawn-templates.mjs';
test('new casual shorts have twelve named panels and ten independent kits, including polos, Prime and the classic shirt',async()=>{
 const base=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='bermuda-passeio-v2');assert.ok(base);assert.equal(base.descriptor.panelCount,12);assert.equal(base.descriptor.line,'passeio');assert.equal(base.descriptor.panels.filter(p=>/Vista/.test(p.label)).length,4);assert.equal(base.descriptor.panels.filter(p=>/Cós/.test(p.label)).length,4);assert.equal(kits.length,10);
 assert.ok(kits.some(e=>e.descriptor.sourceComponents[0].templateId==='camiseta-teste-clo-v1'));assert.ok(kits.some(e=>e.descriptor.sourceComponents[0].templateId==='kit-passeio-prime-camiseta'));assert.equal(kits.filter(e=>e.descriptor.garments[0]==='Polo').length,2);
 for(const e of [base,...kits]){assert.equal(isWithdrawnTemplate(e.descriptor.id),false);assert.equal(e.descriptor.previewBaseColors.lower,'#d51d2f');assert.equal(e.descriptor.fitVersion,'passeio-v2');}
});
test('red lower garments fit below the actual shirt surface in every final GLB, with exact UV regions and registered hashes',async()=>{
 for(const e of kits){const d=e.descriptor,b=await readFile(new URL('../public'+e.assets.model,import.meta.url)),{json,binary}=readGlb(b);assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',b)).toString('hex'),d.sourceSha256);const upper=[],lower=[];
  assert.equal(d.fitVerification.penetrations,0);assert.ok(d.fitVerification.coveredSamples>0);assert.equal(d.sourceComponents[1].templateId,'bermuda-passeio-v2');assert.ok(d.sourceComponents[1].uniformScale>0);
  for(const p of d.panels){const pr=json.meshes[p.mesh].primitives[p.primitive],positions=readAccessor(json,binary,pr.attributes.POSITION).data,indices=readAccessor(json,binary,pr.indices).data,uv=readAccessor(json,binary,pr.attributes.TEXCOORD_0).data;
   if(p.group==='BERMUDA')lower.push({positions,indices});else if(/^(Frente|Costas|Recorte)/.test(p.label))upper.push({positions,indices});
   for(let i=0;i<uv.length;i+=2){const x=uv[i]*4096,y=uv[i+1]*4096;assert.ok(x>=p.rect.x-.003&&x<=p.rect.x+p.rect.w+.003);assert.ok(y>=p.rect.y-.003&&y<=p.rect.y+p.rect.h+.003);}
  }
  assert.equal(lower.length,12);const fit=inspectGarmentFit(upper,lower,new Vector3(0,0,0));assert.equal(fit.penetrations,0,e.descriptor.id);assert.ok(fit.coveredSamples>0);assert.match(await readFile(new URL('../public'+e.assets.proof,import.meta.url),'utf8'),/#d51d2f/);
 }
});
test('the surface checker detects a lower garment crossing the shirt, so a bad fit cannot silently pass',()=>{
 const wall={positions:Float32Array.from([-.5,0,.2,.5,0,.2,.5,1,.2,-.5,1,.2]),indices:Uint32Array.from([0,1,2,0,2,3])},lower={positions:Float32Array.from([-.1,.1,.3,.1,.1,.3,0,.3,.3]),indices:Uint32Array.from([0,1,2])};assert.ok(inspectGarmentFit([wall],[lower],new Vector3(0,0,0)).penetrations>0);
});
