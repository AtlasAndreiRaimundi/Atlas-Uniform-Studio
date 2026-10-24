import {Color,DoubleSide} from './vendor/three/build/three.module.min.js';

const configured=new WeakSet();
export const INTERIOR_SHADER_KEY='atlas-gray-fabric-interior-v2';
export const FABRIC_INTERIOR_COLOR='#d0d0d0';

// One surface, two finishes. Keep the exterior texture and every vertex/UV intact.
// Convert the light gray from sRGB to linear space before physical lighting.
export function useFabricInterior(material){
  if(!material||configured.has(material))return material;
  if(!material.isMeshStandardMaterial&&!material.isMeshBasicMaterial)throw new Error('O tecido precisa de um material de superfície compatível.');
  const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.side=DoubleSide;
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    const marker='#include <color_fragment>';
    if(!shader.fragmentShader.includes(marker)||!shader.fragmentShader.includes('#include <common>'))throw new Error('Não foi possível preparar o acabamento interno do tecido.');
    shader.uniforms ||= {};
    shader.uniforms.atlasFabricInteriorColor={value:new Color(FABRIC_INTERIOR_COLOR)};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 atlasFabricInteriorColor;');
    shader.fragmentShader=shader.fragmentShader.replace(marker,`${marker}\n// ${INTERIOR_SHADER_KEY}\nif (!gl_FrontFacing) { diffuseColor.rgb = atlasFabricInteriorColor; }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif (!gl_FrontFacing) { totalEmissiveRadiance = vec3(0.0); }');
  };
  material.customProgramCacheKey=()=>`${cacheKey}|${INTERIOR_SHADER_KEY}`;
  material.needsUpdate=true;configured.add(material);return material;
}

// Keep previously cached viewer entrypoints compatible during an update.
export const useWhiteFabricInterior=useFabricInterior;
