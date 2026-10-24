import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Simulador de uniformes — Atlas Uniform Studio'};
export default async function UniformSimulator({searchParams}:{searchParams:Promise<{design?:string;order?:string}>}){
 const params=await searchParams,query=new URLSearchParams();for(const key of ['design','order'] as const)if(typeof params[key]==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(params[key]!))query.set(key,params[key]!);
 await requireChatGPTUser('/simulador'+(query.size?'?'+query:''));
 return <iframe allowFullScreen className="studio-frame" title="Simulador de uniformes ATLAS" src={'/simulador/editor.html'+(query.size?'?'+query:'')}/>;
}
