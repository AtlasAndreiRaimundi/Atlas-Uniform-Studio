import {OrderTechnicalService} from '../lib/order-technical-service.mjs';
export async function attachFixtureCDR(service,user,saved,document){
 const technical=new OrderTechnicalService(service.db,service.bucket,service,null),file=new File([new Uint8Array([82,73,70,70,50,0,0,0,67,68,82,88]),'test drawing'],'fixture.cdr');
 const uploaded=await technical.attach(user,saved.id,saved.version,file);document.technicalFiles=uploaded.document.technicalFiles;return uploaded;
}
