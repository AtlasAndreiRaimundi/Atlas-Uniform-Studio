import {AppError} from './project-service.mjs';

// Unit codes are controlled by the server. The public order form cannot change
// them. Keep a separate, durable sequence for each future production unit.
export const DEFAULT_ORDER_UNIT='MNZ';
export async function allocateOrderNumber(db,{unit=DEFAULT_ORDER_UNIT,now=new Date()}={}){
 if(!/^[A-Z0-9]{2,10}$/.test(unit))throw new AppError(500,'A unidade de produção não está configurada corretamente.');
 const month=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',month:'2-digit'}).format(now);
 // One atomic statement reserves the identifier, including concurrent requests
 // from different accounts. Seed above existing unit codes without renumbering
 // legacy records. Deleting an order never returns its identifier to the pool.
 const suffix='-'+unit,row=await db.prepare(`
  INSERT INTO production_order_sequences (unit,last_value)
  SELECT ?,COALESCE(MAX(CAST(substr(trim(order_number),1,4) AS INTEGER)),0)+1
  FROM production_orders
  WHERE upper(trim(order_number)) GLOB '[0-9][0-9][0-9][0-9]-*'
    AND substr(upper(trim(order_number)),-?)=?
  HAVING COALESCE(MAX(CAST(substr(trim(order_number),1,4) AS INTEGER)),0)<9999
  ON CONFLICT(unit) DO UPDATE SET last_value=MAX(production_order_sequences.last_value,excluded.last_value-1)+1
  WHERE MAX(production_order_sequences.last_value,excluded.last_value-1)<9999
  RETURNING last_value
 `).bind(unit,suffix.length,suffix).first();
 if(!row)throw new AppError(409,'A unidade atingiu o limite de 9.999 identificadores. Configure uma nova série antes de criar outro pedido.');
 return String(row.last_value).padStart(4,'0')+'-'+month+'-'+unit;
}
