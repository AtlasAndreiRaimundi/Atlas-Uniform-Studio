'use client';
import {useState,useEffect} from 'react';
import {moldCollection,collectionMolds,moldOptionName} from '@/public/mold-collections.js';
type Mold={id:string;name:string;category:string;panelCount:number;line?:string;bottomVariant?:string};
export default function MoldPicker({templates,value,onChange,disabled=false}:{templates:Mold[];value:string;onChange:(id:string)=>void;disabled?:boolean}){
 const selected=templates.find(t=>t.id===value),[line,setLine]=useState(moldCollection(selected));
 useEffect(()=>{if(selected)setLine(moldCollection(selected));},[value]);
 const items=collectionMolds(templates,line) as Mold[];
 return <><div className="mold-collection-tabs" role="group" aria-label="Linha de uniformes">{(['jogo','passeio'] as const).map(key=><button type="button" key={key} aria-pressed={line===key} disabled={disabled} onClick={()=>{setLine(key);const first=(collectionMolds(templates,key) as Mold[])[0];onChange(first?.id||'');}}>{key==='jogo'?'JOGO':'PASSEIO'}</button>)}</div><select id="projectMold" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>{!items.length?<option value="">Nenhum molde publicado nesta linha</option>:<>{items.some(t=>t.category!=='conjunto')&&<optgroup label="Peças avulsas">{items.filter(t=>t.category!=='conjunto').map(t=><option key={t.id} value={t.id}>{t.name} · {t.panelCount} painéis</option>)}</optgroup>}{items.some(t=>t.category==='conjunto')&&<optgroup label="Kits completos">{items.filter(t=>t.category==='conjunto').map(t=><option key={t.id} value={t.id}>{moldOptionName(t)} · {t.panelCount} painéis</option>)}</optgroup>}</>}</select></>;
}
