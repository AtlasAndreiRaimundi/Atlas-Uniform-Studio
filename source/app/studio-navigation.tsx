'use client';
import {useId, useRef, useState} from 'react';
import {NAV_GROUPS, NAV_MORE} from '@/public/studio-navigation.js';
type Entry={id:string;label:string;href:string;icon:string;admin?:boolean};
type Props={active:string;isAdmin?:boolean;projectHref?:string;createHref?:string;onCreatePresentation?:()=>void;creationDisabled?:boolean};
export default function StudioNavigation({active,isAdmin=false,projectHref='/projects',createHref='/projects?create=1',onCreatePresentation,creationDisabled=false}:Props) {
  const [open,setOpen]=useState(false),id=useId(),toggle=useRef<HTMLButtonElement>(null);
  function item(entry:Entry) {
    const contents=<><svg className="studio-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={entry.icon}/></svg><span className="studio-nav-label">{entry.label}</span></>;
    const shared={className:'studio-nav-link','data-nav-id':entry.id,'aria-current':entry.id===active?'page' as const:undefined};
    if(entry.id==='create-presentation'&&onCreatePresentation)return <button key={entry.id} {...shared} type="button" disabled={creationDisabled} onClick={()=>{onCreatePresentation();setOpen(false);}}>{contents}</button>;
    const href=entry.id==='projects'?projectHref:entry.id==='create-presentation'?createHref:entry.href;
    return <a key={entry.id} {...shared} href={href} onClick={()=>setOpen(false)}>{contents}</a>;
  }
  return <div className="studio-navigation-shell" data-open={open} onKeyDown={e=>{if(e.key==='Escape'&&open){setOpen(false);toggle.current?.focus();}}}><button className="studio-nav-toggle" type="button" ref={toggle} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Menu do estúdio</button><nav className="studio-navigation" id={id} aria-label="Menu do estúdio"><div className="studio-nav-groups">{NAV_GROUPS.map(group=><section className="studio-nav-group" key={group.id} aria-labelledby={id+'-'+group.id}><h2 id={id+'-'+group.id}>{group.label}</h2><div className="studio-nav-items">{group.items.map(item)}</div></section>)}</div><details className="studio-nav-more" open={NAV_MORE.some(entry=>entry.id===active)||undefined}><summary>Outras opções</summary><div>{NAV_MORE.filter(entry=>!entry.admin||isAdmin).map(item)}</div></details></nav></div>;
}
