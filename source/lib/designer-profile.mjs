import {AppError} from './project-service.mjs';
const text=(value,max,label)=>{if(typeof value!=='string'||value.trim().length>max)throw new AppError(400,label+': confira o preenchimento.');return value.trim();};
export function whatsappContact(input=''){
 const value=text(input,250,'WhatsApp');if(!value)return {whatsapp:'',whatsappUrl:''};
 if(/^https?:\/\//i.test(value)){
  let url;try{url=new URL(value);}catch{throw new AppError(400,'Link do WhatsApp inválido.');}
  if(url.username||url.password||url.port)throw new AppError(400,'Use um link oficial do WhatsApp.');
  if(url.hostname==='wa.me'&&/^\/message\/[a-z0-9]+\/?$/i.test(url.pathname))return {whatsapp:value,whatsappUrl:'https://wa.me'+url.pathname};
  const number=url.hostname==='wa.me'?url.pathname.replace(/^\/|\/$/g,''):['api.whatsapp.com','web.whatsapp.com'].includes(url.hostname)&&url.pathname==='/send'?url.searchParams.get('phone'):'';
  if(!number||!/^\+?\d{8,15}$/.test(number))throw new AppError(400,'Use um número com DDD ou um link wa.me válido.');
  return {whatsapp:value,whatsappUrl:'https://wa.me/'+number.replace(/^\+/,'')};
 }
 if(!/^\+?[\d\s().-]+$/.test(value))throw new AppError(400,'Informe um telefone com DDD ou um link oficial do WhatsApp.');
 let number=value.replace(/\D/g,'');if(!value.startsWith('+')&&[10,11].includes(number.length))number='55'+number;
 if(number.length<10||number.length>15||number.startsWith('0'))throw new AppError(400,'Confira o telefone. Use DDD; para outros países inclua + e o código do país.');
 return {whatsapp:value,whatsappUrl:'https://wa.me/'+number};
}
export function profileDetails(input={},previous={}){
 const details={};for(const [key,max,label] of [['city',100,'Cidade'],['store',120,'Loja / filial'],['role',100,'Função'],['bio',280,'Apresentação'],['contactEmail',160,'E-mail de contato']])details[key]=text(input[key]??previous[key]??'',max,label);
 if(details.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contactEmail))throw new AppError(400,'Confira o e-mail de contato.');
 const wa=whatsappContact(input.whatsapp??previous.whatsapp??'');Object.assign(details,wa);
 if(input.directoryVisible!==undefined&&typeof input.directoryVisible!=='boolean')throw new AppError(400,'Confira a visibilidade do perfil.');
 details.directoryVisible=input.directoryVisible??previous.directoryVisible??false;return details;
}
export function readProfileDetails(value){try{return profileDetails(JSON.parse(value||'{}'));}catch{return profileDetails();}}
