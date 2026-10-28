"""Prepare supplied CLO exports without changing outer geometry or source UVs.
Usage: python scripts/prepare-order-molds.py /path/to/uploads
"""
import sys,json,struct,hashlib,pathlib,copy
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
S={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}; T={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
cos=['Cós do calção 1','Cós do calção 2','Cós do calção 3','Cós do calção 4']
shorts=['Calção direito','Calção esquerdo']
manifest=[
('KIT ELITE 27(1).glb','kit-elite-27','KIT ELITE 27',cos+shorts+['Filete manga direita','Filete manga esquerda']+['Gola '+str(i) for i in range(1,6)]+['Manga esquerda','Manga direita','Recorte direito','Recorte esquerdo','Frente','Costas']),
('KIT RAGLAN BASICO.glb','kit-raglan-basico','KIT RAGLAN BÁSICO',cos+shorts+['Frente','Costas','Gola','Manga esquerda','Manga direita']),
('KIT NORMAL BASICO.glb','kit-normal-basico','KIT NORMAL BÁSICO',cos+shorts+['Gola','Manga direita','Filete manga direita','Filete manga esquerda','Manga esquerda','Costas','Frente']),
('KIT RAGLAN ELITE.glb','kit-raglan-elite','KIT RAGLAN ELITE',['Gola direita','Gola esquerda','Frente','Recorte direito','Recorte esquerdo','Filete manga direita','Filete manga esquerda','Costas','Manga esquerda','Manga direita']+cos+shorts),
('KIT FIELD RAGLAN.glb','kit-field-raglan','KIT FIELD RAGLAN',cos+shorts+['Gola','Filete manga direita','Filete manga esquerda','Manga esquerda','Manga direita','Costas','Frente']),
('POLO.glb','polo','POLO',['Peitilho externo','Filete manga esquerda','Filete manga direita','Costas','Manga direita','Manga esquerda','Peitilho interno','Frente','Pé de gola','Colarinho'])]
def load(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def acc(j,b,i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype(T[a['componentType']]);n=S[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize))
def encode(j,b):
 data=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4);b+=b'\0'*((-len(b))%4)
 return struct.pack('<III',0x46546c67,2,28+len(data)+len(b))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(b),0x004e4942)+b
for filename,slug,name,labels in manifest:
 p=pathlib.Path(sys.argv[1])/filename;j,b=load(p);out=copy.deepcopy(j);out['accessors']=[];out['bufferViews']=[];out['meshes']=[]
 for k in ['images','textures','samplers','extensionsUsed','extensionsRequired','extensions']:out.pop(k,None)
 for node in out.get('nodes',[]):
  node.pop('extensions',None) # Exported studio lights are replaced by the viewer lighting.
 out['materials']=[{'name':'Tecido neutro','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.98},'doubleSided':True}]
 chunks=bytearray()
 def put(a,typ,ctype,target):
  chunks.extend(b'\0'*((-len(chunks))%4));v=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':len(chunks),'byteLength':a.nbytes,'target':target});chunks.extend(a.tobytes());idx=len(out['accessors']);out['accessors'].append({'bufferView':v,'componentType':ctype,'count':len(a),'type':typ});
  if typ=='VEC3':out['accessors'][-1].update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  return idx
 for m,mesh in enumerate(j['meshes']):
  prims=[]
  for pi,pr in enumerate(mesh['primitives']):
   if m<len(labels) and pi!=(1 if slug=='polo' and m==9 else 0):continue
   ix=acc(j,b,pr['indices']).reshape(-1);used,rev=np.unique(ix,return_inverse=True);attrs={}
   for key in ['POSITION','NORMAL','TEXCOORD_0']:
    if key in pr['attributes']:
     a=acc(j,b,pr['attributes'][key])[used].copy().astype('<f4');attrs[key]=put(a,'VEC2' if key.startswith('TEX') else 'VEC3',5126,34962)
   inds=rev.astype('<u4').reshape(-1,1);prims.append({'attributes':attrs,'indices':put(inds,'SCALAR',5125,34963),'material':0})
  out['meshes'].append({'name':labels[m] if m<len(labels) else mesh.get('name','Detalhe'), 'primitives':prims})
 out['buffers']=[{'byteLength':len(chunks)}];out['asset']={'version':'2.0','generator':'ATLAS · outer surface preparation 1'}
 target=ROOT/'public/assets/molds'/slug;target.mkdir(parents=True,exist_ok=True)
 (target/'source.glb').write_bytes(encode(out,bytes(chunks)))
 # A separate cloth-only input lets the strict map generator ignore buttons and stitching.
 cloth=copy.deepcopy(out);cloth['meshes']=cloth['meshes'][:len(labels)]
 for node in cloth.get('nodes',[]):
  if node.get('mesh',-1)>=len(labels):node.pop('mesh')
 (target/'cloth-input.glb').write_bytes(encode(cloth,bytes(chunks)))
 meta={'id':slug,'name':name,'category':'camiseta' if slug=='polo' else 'conjunto','sourceName':filename,'originalSourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'labels':labels,'decorativeMeshes':list(range(len(labels),len(out['meshes'])))}
 (target/'preparation.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(name,len(chunks),len(labels),'cloth meshes')
