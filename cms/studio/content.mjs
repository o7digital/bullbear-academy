import {createHash} from 'node:crypto';
export const locales=['es','en','ru','zh','de','it','fr','pt'];
export const sections=[['inicio','Inicio','/'],['nosotros','Nosotros','/nosotros/'],['trading-club','Trading Club','/trading-club/'],['videos','Videos','/videos/'],['webinars','Webinars','/aprende-lo-fundamental-del-trading/'],['guerra-de-traders','Guerra de Traders','/guerra-de-traders/'],['eventos','Eventos','/proximos-eventos/'],['cursos','Cursos y tienda','/tienda/'],['mentores','Mentores','/#mentores'],['contacto','Contacto','/contacto/'],['faq','Preguntas frecuentes','/preguntas-frecuentes-faq/'],['privacidad','Privacidad','/aviso-de-privacidad/'],['ajustes','Textos generales e idiomas','/']];
export const kinds=['text','page','course','mentor','media','event'];
export const textFields=['title','body','value'];
export const hashSource=row=>createHash('sha256').update(JSON.stringify(Object.fromEntries(textFields.map(k=>[k,row[k]||''])))).digest('hex');
export function validateStripePrice(row,price){
 if(!price.active||price.livemode||price.type!=='one_time'||row.currency!=='MXN'||price.currency!=='mxn'||!/^\d+(?:\.\d{1,2})?$/.test(row.source_price||''))throw new Error('El precio de este curso requiere revisión.');
 const [whole,fraction='']=row.source_price.split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(amount)||amount<=0||price.unit_amount!==amount)throw new Error('El precio de Stripe no coincide con el precio publicado. Revisa la ficha del curso.');
 return price.id;
}
export function assertReady(row) {
 if(row.status!=='published')return;
 if(!row.source_hash || row.source_hash!==hashSource(row))throw new Error(`Traducciones pendientes: ${row.title||row.key||row.id}`);
 for(const locale of locales.filter(x=>x!=='es')) {
  const translated=row.translations?.[locale];
  if(!translated || textFields.some(k=>typeof translated[k]!=='string' || (row[k]?.trim()&&!translated[k].trim())))throw new Error(`Falta la traducción ${locale}: ${row.id}`);
 }
}
export function validateRecord(input,current) {
 const allowed=['kind','section','title','body','value','status','sort','image','video','url','date','category','duration','mentor','source_price','currency','stripe_price_id'];
 if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Contenido inválido.');
 for(const key of Object.keys(input))if(!allowed.includes(key))throw new Error('Campo no permitido: '+key);
 const row={...current,...input};
 if(!kinds.includes(row.kind)||!sections.some(s=>s[0]===row.section)||!['draft','published','archived'].includes(row.status))throw new Error('Tipo, sección o estado inválido.');
 if(current && ['kind','section'].some(k=>input[k]!==undefined&&input[k]!==current[k]))throw new Error('La sección y el tipo de una ficha existente son fijos.');
 for(const key of allowed.filter(x=>x!=='sort'))if(row[key]!==undefined&&row[key]!==null&&(typeof row[key]!=='string'||row[key].length>(key==='body'?18000: key==='value'?12000:2000)))throw new Error('Campo inválido: '+key);
 if(!Number.isInteger(Number(row.sort??0))||Math.abs(Number(row.sort??0))>100000)throw new Error('Orden inválido.');
 row.sort=Number(row.sort??0);
 for(const field of ['url'])if(row[field]&&!/^https:\/\//.test(row[field]))throw new Error('Usa un enlace HTTPS.');
 for(const field of ['image','video'])if(row[field]&&!/^\/[a-zA-Z0-9/_\-.]+$/.test(row[field])&&!/^[a-f0-9-]{36}$/.test(row[field])&&!(field==='video'&&/^[\w-]{11}$/.test(row[field])))throw new Error('Archivo inválido.');
 if(row.stripe_price_id&&!/^price_[a-zA-Z0-9]+$/.test(row.stripe_price_id))throw new Error('El precio Stripe debe comenzar por price_.');
 if(row.currency&&!/^[A-Z]{3}$/.test(row.currency))throw new Error('Usa un código de moneda de tres letras.');
 if(row.source_price&&!/^\d{1,9}(?:\.\d{1,2})?$/.test(row.source_price))throw new Error('Escribe el precio sin separadores de miles, por ejemplo 15900.00.');
 if(row.date&&!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw new Error('Fecha inválida.');
 if(['course','mentor','media','event'].includes(row.kind)&&!row.title?.trim())throw new Error('Escribe un título.');
 return Object.fromEntries([...allowed,'id','key','translations','source_hash'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
}
