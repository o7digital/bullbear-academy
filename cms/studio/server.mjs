import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import Stripe from 'stripe';
import {translateSpanish} from './translations.mjs';
import {sections,locales,hashSource,assertReady,validateRecord,validateStripePrice,textFields} from './content.mjs';

const env=process.env;
const production=env.NODE_ENV==='production';
const cms=(env.DIRECTUS_URL||'').replace(/\/$/,'');
const origin=env.STUDIO_ORIGIN||'http://localhost:3000';
const website=env.STUDIO_PREVIEW_URL||'https://bullbear-academy-preview-git-dev-olivier-steineur.vercel.app';
const secret=env.STUDIO_SESSION_SECRET;
if(!secret||secret.length<32)throw new Error('STUDIO_SESSION_SECRET must contain at least 32 characters.');
const encryptionKey=createHash('sha256').update(secret).digest();
const stripe=env.STRIPE_SECRET_KEY?new Stripe(env.STRIPE_SECRET_KEY):null;
const allowCheckout=env.STRIPE_CHECKOUT_ENABLED==='true'&&env.STRIPE_SECRET_KEY?.startsWith('sk_test_')&&Boolean(env.STRIPE_WEBHOOK_SECRET);
const limits=new Map();
function limit(req,name,max=60){const key=name+':'+req.socket.remoteAddress;const now=Date.now();let item=limits.get(key);if(!item||item.until<now){item={count:0,until:now+60000};limits.set(key,item);}if(++item.count>max)throw Object.assign(new Error('Demasiadas solicitudes. Espera un minuto.'),{status:429});if(limits.size>3000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);}
function seal(data){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey,iv);return Buffer.concat([iv,cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]).toString('base64url');}
function unseal(token){const bytes=Buffer.from(token,'base64url');const decipher=createDecipheriv('aes-256-gcm',encryptionKey,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());}
function cookie(res,data){res.setHeader('Set-Cookie',`bull_studio=${data?seal(data):''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${data?28800:0}${production?'; Secure':''}`);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function fail(message,status=400){return Object.assign(new Error(message),{status});}
async function bytes(req,max=100000){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw fail('El archivo o formulario es demasiado grande.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
async function body(req){try{return JSON.parse((await bytes(req)).toString());}catch(e){if(e.status)throw e;throw fail('Formulario inválido.');}}
async function directus(path,token,method='GET',data){const response=await fetch(cms+path,{method,headers:{Authorization:`Bearer ${token}`,...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data!==undefined?JSON.stringify(data):undefined,signal:AbortSignal.timeout(45000)});if(!response.ok)throw fail(response.status===401?'La sesión expiró. Vuelve a entrar.':'No se pudo completar la operación en el contenido.',response.status===401?401:502);if(response.status===204)return null;return (await response.json()).data;}
async function session(req,res){try{const value=req.headers.cookie?.split('; ').find(x=>x.startsWith('bull_studio='))?.slice(12);if(!value)throw 0;const data=unseal(value);if(data.until<Date.now())throw 0;if(data.expires<Date.now()+30000){const response=await fetch(cms+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:data.refresh,mode:'json'}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw 0;const {data:next}=await response.json();data.token=next.access_token;data.refresh=next.refresh_token;data.expires=Date.now()+next.expires;cookie(res,data);}return data;}catch{throw fail('Entra al Studio para continuar.',401);}}
const lockState={tail:Promise.resolve()};
function serialize(fn){const next=lockState.tail.then(fn);lockState.tail=next.catch(()=>{});return next;}
async function saveRecord(input,current,token){let row;try{row=validateRecord(input,current);}catch(error){throw fail(error.message,400);}row.id=current?.id||randomUUID();const changed=!current||hashSource(row)!==current.source_hash||['duration','category'].some(k=>row[k]!==current?.[k]);
 if(changed){const fields=row.kind==='course'?[...textFields,'duration','category']:textFields;const sources=fields.map(key=>({key,value:row[key]||''}));const translated=await translateSpanish(sources,{key:env.OPENAI_API_KEY,model:env.TRANSLATION_MODEL||'gpt-5.4-mini'});row.translations=translated;row.source_hash=hashSource(row);}
 assertReady(row);
 return directus('/items/academy_content'+(current?'/'+encodeURIComponent(row.id):''),token,current?'PATCH':'POST',row);
}
async function checkout(req,res){limit(req,'checkout',15);if(req.headers.origin!==new URL(website).origin)throw fail('Origen no permitido.',403);if(!allowCheckout)throw fail('Los pagos de prueba todavía no están habilitados. Contacta con la academia.',503);const input=await body(req);if(Object.keys(input).some(k=>!['course','locale','return_path'].includes(k)))throw fail('Solicitud inválida.');if(typeof input.course!=='string'||!/^[\w-]{1,200}$/.test(input.course))throw fail('Curso inválido.');
 const row=await directus('/items/academy_content/'+encodeURIComponent(input.course),env.STUDIO_CONTENT_TOKEN);
 if(row.kind!=='course'||row.status!=='published'||!row.stripe_price_id)throw fail('Este curso todavía no está disponible para pago.',409);
 const price=await stripe.prices.retrieve(row.stripe_price_id);try{validateStripePrice(row,price);}catch(error){throw fail(error.message,409);}
 const locale=locales.includes(input.locale)?input.locale:'es';const localized={es:'/tienda/',en:'/en/courses/',ru:'/ru/courses/',zh:'/zh/courses/',de:'/de/courses/',it:'/it/courses/',fr:'/fr/courses/',pt:'/pt/courses/'}[locale];
 const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price:price.id,quantity:1}],locale:locale==='zh'?'zh':locale==='pt'?'pt-BR':locale,metadata:{course_id:row.id,course_title:row.title},success_url:website+localized+'?checkout=returned',cancel_url:website+localized+'?checkout=cancelled'});
 json(res,200,{url:session.url});
}
async function webhook(req,res){if(!stripe||!env.STRIPE_WEBHOOK_SECRET)throw fail('Webhook no configurado.',503);const raw=await bytes(req,2000000);let event;try{event=stripe.webhooks.constructEvent(raw,req.headers['stripe-signature'],env.STRIPE_WEBHOOK_SECRET);}catch{throw fail('Firma inválida.',400);}if(event.livemode)throw fail('Este entorno solo acepta pruebas.',400);
 if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)){
  const s=event.data.object;if(!s.metadata?.course_id)throw fail('Curso ausente.',400);
  await serialize(async()=>{let old;try{old=await directus('/items/academy_orders/'+s.id,env.STUDIO_CONTENT_TOKEN);}catch(e){if(e.status!==502)throw e;}
   const paid=s.payment_status==='paid'||old?.payment_status==='paid';
   const row={id:s.id,course_id:s.metadata.course_id,course_title:s.metadata.course_title||'',amount:s.amount_total,currency:s.currency,email:s.customer_details?.email||'',payment_status:paid?'paid':event.type.endsWith('failed')?'failed':'pending',stripe_event:event.id};
   await directus('/items/academy_orders'+(old?'/'+s.id:''),env.STUDIO_CONTENT_TOKEN,old?'PATCH':'POST',row);
  });
 }
 json(res,200,{received:true});
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.avif':'image/avif','.gif':'image/gif','.ttf':'font/ttf','.svg':'image/svg+xml'};
const staticRoot=resolve(import.meta.dirname,'public');
const server=createServer(async(req,res)=>{try{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https://i.ytimg.com; media-src 'self' https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 if(path==='/health')return json(res,200,{status:'ok',service:'bull-academy-studio'});
 const commerce=path.startsWith('/commerce/');if(commerce&&req.headers.origin===new URL(website).origin){res.setHeader('Access-Control-Allow-Origin',new URL(website).origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
 if(commerce&&req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 if(path==='/commerce/status'&&req.method==='GET')return json(res,200,{enabled:Boolean(allowCheckout),mode:'test'});
 if(path==='/commerce/checkout'&&req.method==='POST')return await checkout(req,res);
 if(path==='/commerce/webhook'&&req.method==='POST')return await webhook(req,res);
 if(path.startsWith('/api/')&&req.method!=='GET'&&req.headers.origin!==origin)throw fail('Origen no permitido.',403);
 if(path==='/api/login'&&req.method==='POST'){limit(req,'login',8);const input=await body(req);const response=await fetch(cms+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:input.email,password:input.password,mode:'json'}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw fail('Revisa tu correo y contraseña.',401);const{data}=await response.json();const me=await directus('/users/me?fields=id,email,first_name,last_name',data.access_token);cookie(res,{token:data.access_token,refresh:data.refresh_token,expires:Date.now()+data.expires,until:Date.now()+28800000});return json(res,200,{user:me});}
 if(path.startsWith('/api/')){
  const auth=await session(req,res);limit(req,'api',120);
  if(path==='/api/session'&&req.method==='GET'){const user=await directus('/users/me?fields=id,email,first_name,last_name',auth.token);return json(res,200,{user,sections,locales,preview:website,payments:{configured:Boolean(stripe&&env.STRIPE_WEBHOOK_SECRET),enabled:Boolean(allowCheckout),mode:'test'},translation:Boolean(env.OPENAI_API_KEY)});}
  if(path==='/api/logout'&&req.method==='POST'){await fetch(cms+'/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh})}).catch(()=>{});cookie(res,null);return json(res,200,{ok:true});}
  if(path==='/api/content'&&req.method==='GET')return json(res,200,{data:await directus('/items/academy_content?limit=-1&sort=sort,id',auth.token)});
  if(path==='/api/orders'&&req.method==='GET')return json(res,200,{data:await directus('/items/academy_orders?limit=100&sort=-id',auth.token)});
  const match=path.match(/^\/api\/content\/([\w-]{1,200})$/);
  if(match&&req.method==='PATCH'){const input=await body(req);const data=await serialize(async()=>saveRecord(input,await directus('/items/academy_content/'+match[1],auth.token),auth.token));return json(res,200,{data});}
  if(path==='/api/new'&&req.method==='POST'){const input=await body(req);if(!['media','event','course','mentor'].includes(input.kind))throw fail('Tipo de contenido inválido.');return json(res,201,{data:await serialize(()=>saveRecord({...input,status:input.status||'draft'},null,auth.token))});}
  if(path==='/api/publish'&&req.method==='POST'){return await serialize(async()=>{const rows=await directus('/items/academy_content?limit=-1',auth.token);rows.forEach(assertReady);if(!env.VERCEL_PREVIEW_DEPLOY_HOOK)throw fail('La publicación no está configurada.',503);const response=await fetch(env.VERCEL_PREVIEW_DEPLOY_HOOK,{method:'POST',signal:AbortSignal.timeout(20000)});if(!response.ok)throw fail('No se pudo solicitar la publicación. Vuelve a intentar.',502);return json(res,202,{message:'Publicación de dev solicitada. Espera a que termine la compilación antes de revisar el sitio.'});});}
  if(path==='/api/upload'&&req.method==='POST'){
   const length=Number(req.headers['content-length']);if(!length||length>251*1024*1024||!req.headers['content-type']?.startsWith('multipart/form-data;'))throw fail('Sube una imagen o vídeo de hasta 250 MB.',413);
   const response=await fetch(cms+'/files',{method:'POST',headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':req.headers['content-type'],'Content-Length':String(length)},body:req,duplex:'half',signal:AbortSignal.timeout(300000)});
   if(!response.ok)throw fail('No se pudo subir el archivo.',502);const{data}=await response.json();if(!/^image\/(jpeg|png|webp|avif)$|^video\/(mp4|webm)$/.test(data.type||'')){await directus('/files/'+data.id,auth.token,'DELETE');throw fail('Usa JPG, PNG, WebP, AVIF, MP4 o WebM.');}if(data.type.startsWith('image/')&&Number(data.filesize)>25*1024*1024){await directus('/files/'+data.id,auth.token,'DELETE');throw fail('Las fotos pueden pesar hasta 25 MB.',413);}return json(res,201,{data:{id:data.id,type:data.type,title:data.title,filesize:data.filesize,width:data.width,height:data.height,filename_download:data.filename_download}});
  }
  const fileInfo=path.match(/^\/api\/files\/([a-f\d-]{36})$/);
  if(fileInfo&&req.method==='GET')return json(res,200,{data:await directus('/files/'+fileInfo[1]+'?fields=id,title,type,filesize,width,height,filename_download',auth.token)});
  const asset=path.match(/^\/api\/asset\/([a-f\d-]{36})$/);
  if(asset&&req.method==='GET'){const headers={Authorization:`Bearer ${auth.token}`};if(req.headers.range)headers.Range=req.headers.range;const response=await fetch(cms+'/assets/'+asset[1],{headers,signal:AbortSignal.timeout(60000)});if(!response.ok)throw fail('Archivo no disponible.',404);res.statusCode=response.status;for(const h of ['content-type','content-length','content-range','accept-ranges'])if(response.headers.has(h))res.setHeader(h,response.headers.get(h));res.setHeader('Cache-Control','private, max-age=60');return Readable.fromWeb(response.body).pipe(res);}
  throw fail('Ruta no encontrada.',404);
 }
 if(req.method!=='GET')throw fail('Método no permitido.',405);
 const file=resolve(staticRoot,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));if(!file.startsWith(staticRoot+'/')||!types[extname(file)])throw fail('No encontrado.',404);
 const content=await readFile(file).catch(()=>{throw fail('No encontrado.',404);});res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':extname(file)==='.html'?'no-store':'public, max-age=300'});res.end(content);
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'No se pudo completar la operación. Tus cambios siguen en el formulario.'});else res.end();if(!e.status)console.error('Request failed:',e.name);}});
server.requestTimeout=330000;
server.listen(Number(env.PORT||3000),'0.0.0.0',()=>console.log('Bull Academy Studio listening'));
