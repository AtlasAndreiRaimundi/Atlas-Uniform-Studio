import {AppError} from './project-service.mjs';
import {isAdminUser} from './admin-auth.mjs';

export const FACTORIES=Object.freeze({meinerz:'MEINERZ',adiprime:'ADIPRIME'});
export const factoryValid=id=>Object.hasOwn(FACTORIES,id);
export const factoryName=id=>FACTORIES[id]||'Não definida';
export function requireFactoryId(value){if(!factoryValid(value))throw new AppError(400,'Escolha a indústria Meinerz ou Adiprime.');return value;}
export async function allowedFactories(db,user,adminId=''){
 if(!user?.userId)throw new AppError(401,'Entre na sua conta para consultar a produção.');
 if(isAdminUser(user,adminId))return Object.keys(FACTORIES);
 const rows=await db.prepare('SELECT factory_id FROM factory_memberships WHERE user_id=? AND enabled=1').bind(user.userId).all();
 return rows.results.map(row=>row.factory_id).filter(factoryValid);
}
export async function requireFactoryAccess(db,user,factoryId,adminId=''){
 requireFactoryId(factoryId);
 if(!user?.userId)throw new AppError(401,'Entre na sua conta para consultar a produção.');
 if(isAdminUser(user,adminId))return;
 const row=await db.prepare('SELECT 1 AS allowed FROM factory_memberships WHERE user_id=? AND factory_id=? AND enabled=1').bind(user.userId,factoryId).first();
 if(!row)throw new AppError(403,'Este pedido pertence a outra indústria ou você não tem autorização.');
}
