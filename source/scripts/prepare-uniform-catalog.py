"""Prepare the supplied Corel palette and fonts; preserve their original values."""
from pathlib import Path
import json, hashlib, xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from PIL import Image, ImageCms

root=Path(__file__).resolve().parents[1]/'public'/'simulador'
source=root/'paleta-sublimacao-2026.xml'
palette=ET.parse(source).getroot()
spaces={s.attrib['name']:s.find('color').attrib for s in palette.findall('./colorspaces/cs')}
srgb=ImageCms.getOpenProfile('/usr/share/color/icc/sRGB.icc')
cmyk=ImageCms.getOpenProfile('/usr/share/texlive/texmf-dist/tex/generic/colorprofiles/FOGRA39L_coated.icc')
lab=ImageCms.createProfile('LAB',5000)
colors=[]
for n,c in enumerate(palette.findall('./colors/page/color'),1):
    a=c.attrib;cs=a['cs'];values=[float(x)for x in a['tints'].split(',')];entry={'id':f'mnz2026-{n:03}','name':a['name'],'space':cs,'values':values}
    if cs=='RGB':rgb=tuple(round(v*255)for v in values);entry['approximate']=False
    elif cs=='LAB':
        # Corel uses normalized L, a and b (a,b biased by 128) in this XML.
        native=[values[0]*100,values[1]*255-128,values[2]*255-128];entry['lab']=native
        im=Image.new('LAB',(1,1),tuple(round(v*255)for v in values));rgb=ImageCms.profileToProfile(im,lab,srgb,outputMode='RGB').getpixel((0,0));entry.update(approximate=True,previewProfile='Lab D50 → sRGB')
    elif cs in spaces:
        definition=spaces[cs];process=[float(x)for x in definition['tints'].split(',')];entry['definition']={'space':definition['cs'],'values':process}
        im=Image.new('CMYK',(1,1),tuple(round(v*255)for v in process));rgb=ImageCms.profileToProfile(im,cmyk,srgb,outputMode='RGB').getpixel((0,0));entry.update(approximate=True,previewProfile='FOGRA39L coated → sRGB; referência de tela')
    else:raise ValueError('Unknown palette space: '+cs)
    entry['hex']='#'+''.join(f'{v:02x}'for v in rgb);colors.append(entry)
fonts=[]
for id,label,family,filename in [('mnz-autumn-26','MNZ AUTUMN 26','MNZAutumn26','mnz-autumn-26.ttf'),('mnz-revoke-26','MNZ REVOKE 26','MNZRevoke26','mnz-revoke-26.ttf'),('mnz-bilbao-26','MNZ BILBAO 26','MNZBilbao26','mnz-bilbao-26.ttf')]:
    path=root/'fonts'/filename;font=TTFont(path);fonts.append({'id':id,'label':label,'family':family,'file':'./fonts/'+filename,'characters':sorted(font.getBestCmap()),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
catalog={'name':palette.attrib['name'],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'colors':colors,'fonts':fonts}
(root/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
(root/'catalog.js').write_text('// Generated from the supplied palette and original font files.\nexport const CATALOG='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\nexport const COLORS=CATALOG.colors;\nexport const UNIFORM_FONTS=CATALOG.fonts;\nexport const DEFAULT_BASE=COLORS.find(c=>c.hex==="#075c4e");\nexport const DEFAULT_ACCENT=COLORS.find(c=>c.hex==="#e4f976");\nexport const DEFAULT_INK=COLORS.find(c=>c.hex==="#ffffff");\nexport const paletteColor=value=>COLORS.find(c=>c.id===value||c.hex===String(value).toLowerCase())??null;\nexport function applyColor(target,value){const c=paletteColor(value);if(!c)throw Error("Escolha uma cor da PALETA SUBLIMAÇÃO 2026.");target.color=c.hex;target.colorId=c.id;return c;}\n')
print(json.dumps({'colors':len(colors),'fonts':len(fonts),'approximations':[c['name']for c in colors if c['approximate']]},ensure_ascii=False))
