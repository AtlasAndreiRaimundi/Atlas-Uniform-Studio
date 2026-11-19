"""Prepare the owner's November 2026 CLO pack, retaining cloth geometry and UVs.
Original uploads remain untouched. Run with the upload directory as argument.
"""
import sys,json,struct,hashlib,pathlib,copy,unicodedata
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
S={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};T={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
def acc(j,b,i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype(T[a['componentType']]);n=S[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize))
def encode(j,b):
 data=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4);b+=b'\0'*((-len(b))%4)
 return struct.pack('<III',0x46546c67,2,28+len(data)+len(b))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(b),0x004e4942)+b
entries=[]
for path in sorted(pathlib.Path(sys.argv[1]).glob('*.glb')):
 original=path.read_bytes();n=struct.unpack_from('<I',original,12)[0];j=json.loads(original[20:20+n]);b=original[28+n:];kept=[];labels=[];types=[];raglan=False
 for i,m in enumerate(j['meshes']):
  if any(x in m.get('name','').lower() for x in ['head_','topstitch','button','avatar','mannequin']):continue
  pr=m['primitives'][0];xyz=acc(j,b,pr['attributes']['POSITION']);center=(xyz.min(0)+xyz.max(0))/2;extent=np.ptp(xyz,axis=0);x,y,z=map(float,center);dx,dy,dz=map(float,extent);side='esquerdo' if x>0 else 'direito';sleeveSide='esquerda' if x>0 else 'direita'
  if i<2:label='Calção '+side;kind='shorts'
  elif i<4:label='Cós '+side;kind='waist'
  elif dy>.19 and dx>.09:label='Frente' if z>0 else 'Costas';kind='body'
  elif abs(x)>.035 and dy>.06:
   if dx<.026:label='Recorte lateral '+side;kind='side-cut'
   else:label='Manga '+sleeveSide;kind='sleeve';raglan=raglan or dx>.06
  elif abs(x)>.04 and dy<.04:label='Filete manga '+sleeveSide;kind='filet'
  elif y>.55:label='Gola '+('frente' if z>.012 else 'costas' if z<-.005 else 'inteira');kind='collar'
  elif abs(x)<.035 and y>.52:label='Peitilho';kind='collar'
  else:raise ValueError('Classificação pendente: '+path.name+' / '+str(i)+' '+str(center))
  kept.append(i);labels.append(label);types.append(kind)
 name=path.name.upper();modeling='RAGLAN' if raglan or 'RAGLAN' in name else 'NORMAL';cut='side-cut' in types
 collar='BRASIL' if 'BRASIL' in name else 'V TRASPASSADA' if 'TRASPASSADA' in name else 'V' if 'RAGLAN V' in name else 'PRESTIGE' if 'PRESTIGE' in name else 'FIELD' if 'FIELD' in name else 'ELITE ARREDONDADA' if 'ARREDONDADO' in name else 'ELITE' if 'ELITE' in name else 'GOLA 27' if 'GOLA 27' in name else 'POLO RETRÔ' if 'RETRO' in name else 'POLO REDONDA' if 'POLO REDONDA' in name else 'POLO' if 'POLO' in name else 'REDONDA'
 variant='FAIXA' if 'FAIXA' in name else ''
 title='KIT · '+modeling+' · '+collar+' · '+('COM RECORTE' if cut else 'SEM RECORTE')+(' · '+variant if variant else '')+' · CALÇÃO 2 PARTES'
 slug='pack26-'+unicodedata.normalize('NFD',modeling+'-'+collar+'-'+('com-recorte' if cut else 'sem-recorte')+('-'+variant if variant else '')).encode('ascii','ignore').decode().lower().replace(' ','-')
 if any(e['id']==slug for e in entries):raise ValueError('ID repetido '+slug)
 out=copy.deepcopy(j);out['meshes']=[];out['bufferViews']=[];out['accessors']=[]
 for key in ['images','textures','samplers','extensionsUsed','extensionsRequired','extensions','skins','animations','cameras']:out.pop(key,None)
 out['materials']=[{'name':'Tecido neutro','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.98},'doubleSided':True}];chunks=bytearray()
 def put(a,typ,ctype,target):
  chunks.extend(b'\0'*((-len(chunks))%4));v=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':len(chunks),'byteLength':a.nbytes,'target':target});chunks.extend(a.tobytes());idx=len(out['accessors']);out['accessors'].append({'bufferView':v,'componentType':ctype,'count':len(a),'type':typ})
  if typ=='VEC3':out['accessors'][-1].update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  return idx
 cloth_count=len(kept);decorative=[i for i,m in enumerate(j['meshes']) if any(x in m.get('name','').lower() for x in ['topstitch','button'])];kept+=decorative
 for k,i in enumerate(kept):
  pr=j['meshes'][i]['primitives'][0];ix=acc(j,b,pr['indices']).reshape(-1);used,rev=np.unique(ix,return_inverse=True);attrs={}
  for key in ['POSITION','NORMAL','TEXCOORD_0']:
   if key in pr['attributes']:a=acc(j,b,pr['attributes'][key])[used].copy().astype('<f4');attrs[key]=put(a,'VEC2' if key.startswith('TEX') else 'VEC3',5126,34962)
  dtype='<u2' if len(used)<=65535 else '<u4';indices=put(rev.astype(dtype).reshape(-1,1),'SCALAR',5123 if dtype=='<u2' else 5125,34963);out['meshes'].append({'name':labels[k] if k<cloth_count else j['meshes'][i]['name'],'primitives':[{'attributes':attrs,'indices':indices,'material':0}]})
 remap={i:k for k,i in enumerate(kept)}
 for node in out['nodes']:
  node.pop('extensions',None);node.pop('skin',None);node.pop('camera',None)
  if 'mesh'in node:
   if node['mesh']in remap:node['mesh']=remap[node['mesh']]
   else:node.pop('mesh')
 out['buffers']=[{'byteLength':len(chunks)}];out['asset']={'version':'2.0','generator':'ATLAS presentation pack cloth preparation 2026-11'}
 target=ROOT/'public/assets/molds'/slug;target.mkdir(parents=True,exist_ok=True);prepared=encode(out,bytes(chunks));(target/'source.glb').write_bytes(prepared);cloth=copy.deepcopy(out);cloth['meshes']=cloth['meshes'][:cloth_count]
 for node in cloth['nodes']:
  if node.get('mesh',-1)>=cloth_count:node.pop('mesh')
 (target/'cloth-input.glb').write_bytes(encode(cloth,bytes(chunks)))
 meta={'id':slug,'name':title,'category':'conjunto','sourceName':path.name,'originalSourceSha256':hashlib.sha256(original).hexdigest(),'labels':labels,'panelKinds':types,'decorativeMeshes':list(range(cloth_count,len(kept))),'modeling':modeling,'collar':collar,'sideCut':cut,'bottomParts':2,'variant':variant,'packId':'kits-2026-11'}
 (target/'preparation.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');entries.append(meta);print(slug,len(prepared),len(labels),'panels',flush=True)
(ROOT/'scripts/presentation-pack-manifest.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
