import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Color,MeshStandardMaterial,MeshPhysicalMaterial,MeshBasicMaterial,Texture,ShaderLib,DoubleSide,FrontSide} from '../public/vendor/three/build/three.module.min.js';
import {useFabricInterior,FABRIC_INTERIOR_COLOR,INTERIOR_SHADER_KEY} from '../public/fabric-interior.js';

test('interior finish overrides only back-facing diffuse color before physical lighting',()=>{
  const map=new Texture(),normal=new Texture(),material=new MeshStandardMaterial({map,normalMap:normal,color:0xff1122,roughness:.92,side:FrontSide});
  const original=ShaderLib.standard.fragmentShader,shader={fragmentShader:original};
  useFabricInterior(material);material.onBeforeCompile(shader,{});
  assert.equal(material.side,DoubleSide);assert.equal(material.map,map);assert.equal(material.normalMap,normal);assert.equal(material.color.getHex(),0xff1122);assert.equal(material.roughness,.92);
  assert.match(shader.fragmentShader,/if \(!gl_FrontFacing\) \{ diffuseColor.rgb = atlasFabricInteriorColor; \}/);
  const interior=shader.uniforms.atlasFabricInteriorColor.value;
  assert.equal(interior.getHexString(),'d0d0d0');assert.ok(interior.r<.7&&interior.r>.6);assert.equal(interior.r,interior.g);assert.equal(interior.g,interior.b);
  assert.deepEqual(interior,new Color(FABRIC_INTERIOR_COLOR));
  assert.ok(shader.fragmentShader.indexOf('diffuseColor.rgb = atlasFabricInteriorColor')>shader.fragmentShader.indexOf('#include <map_fragment>'));
  assert.ok(shader.fragmentShader.indexOf('diffuseColor.rgb = atlasFabricInteriorColor')<shader.fragmentShader.indexOf('#include <lights_fragment_begin>'));
  assert.equal(shader.fragmentShader.replace('\nuniform vec3 atlasFabricInteriorColor;','').replace(`\n// ${INTERIOR_SHADER_KEY}\nif (!gl_FrontFacing) { diffuseColor.rgb = atlasFabricInteriorColor; }`,'').replace('\nif (!gl_FrontFacing) { totalEmissiveRadiance = vec3(0.0); }',''),original);
});
test('shared materials are patched once, clones are configured explicitly, and cache keys stay distinct',()=>{
  const base=new MeshStandardMaterial(),plainKey=base.customProgramCacheKey();useFabricInterior(base);const first=base.onBeforeCompile,key=base.customProgramCacheKey();useFabricInterior(base);assert.equal(base.onBeforeCompile,first);assert.equal(base.customProgramCacheKey(),key);assert.notEqual(key,plainKey);
  const clone=base.clone();useFabricInterior(clone);const shader={fragmentShader:ShaderLib.standard.fragmentShader};clone.onBeforeCompile(shader,{});assert.equal(shader.fragmentShader.split('diffuseColor.rgb = atlasFabricInteriorColor').length-1,1);
});
test('original shader hooks and physical fabric materials keep their exterior behavior',()=>{
  const material=new MeshPhysicalMaterial();material.onBeforeCompile=shader=>{shader.fragmentShader+='\n// original hook';};useFabricInterior(material);const shader={fragmentShader:ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader,{});assert.ok(shader.fragmentShader.endsWith('// original hook'));assert.match(shader.fragmentShader,/gl_FrontFacing/);
});
test('unlit GLTF materials also accept an interior finish without losing the exterior map',()=>{
  const map=new Texture(),material=new MeshBasicMaterial({map});useFabricInterior(material);const shader={fragmentShader:ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader,{});assert.equal(material.map,map);assert.equal(shader.uniforms.atlasFabricInteriorColor.value.getHexString(),'d0d0d0');assert.match(shader.fragmentShader,/diffuseColor.rgb = atlasFabricInteriorColor/);
});
