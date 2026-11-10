import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertReady} from './studio/content.mjs';
import {loadEnvFile} from 'node:process';
try{loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
const base=process.env.DIRECTUS_URL,token=process.env.DIRECTUS_READ_TOKEN;
const empty={records:[],studio:'',commerce:'',generated_at:null};
await mkdir('src/data',{recursive:true});
if(!base){await writeFile('src/data/cms.generated.json',JSON.stringify(empty));console.log('CMS not configured: using local content.');process.exit(0);}
if(!token||!base.startsWith('https://'))throw new Error('CMS requires an HTTPS URL and private read token.');
async function get(path){const response=await fetch(base.replace(/\/$/,'')+path,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`CMS read failed (${response.status}): ${path}`);return response;}
const response=await get('/items/academy_content?filter[status][_eq]=published&sort=sort,id&limit=-1');
const {data:records}=await response.json();
if(!Array.isArray(records)||!records.length)throw new Error('CMS returned no published content.');
records.forEach(assertReady);
if(records.filter(r=>r.kind==='course').length===0)throw new Error('At least one published course is required.');
await rm('public/_cms',{recursive:true,force:true});await mkdir('public/_cms',{recursive:true});
const files=new Map();
for(const row of records)for(const field of ['image','video']){
 const file=row[field];if(!file||!/[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}/i.test(file))continue;
 if(!files.has(file)){
  const meta=(await(await get('/files/'+encodeURIComponent(file)+'?fields=id,type,filesize,modified_on')).json()).data;
  const extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/avif':'.avif','video/mp4':'.mp4','video/webm':'.webm'}[meta.type];
  if(!extension)throw new Error('Unsupported CMS media type.');
  const name=createHash('sha256').update(file+':'+meta.modified_on+':'+meta.filesize).digest('hex').slice(0,24)+extension;
  const bytes=Buffer.from(await(await get('/assets/'+encodeURIComponent(file))).arrayBuffer());
  if(bytes.length!==Number(meta.filesize))throw new Error('Incomplete CMS asset download.');
  await writeFile('public/_cms/'+name,bytes);files.set(file,'/_cms/'+name);
 }
 row[field]=files.get(file);
}
// Stripe IDs and editorial provenance stay on the server. Checkout accepts a course ID only.
for(const row of records){delete row.stripe_price_id;delete row.source_hash;delete row.key_hash;}
const result={records,studio:process.env.PUBLIC_STUDIO_URL||'',commerce:process.env.PUBLIC_COMMERCE_URL||'',generated_at:new Date().toISOString()};
await writeFile('src/data/cms.generated.json',JSON.stringify(result));
console.log('CMS synchronized:',records.length,'published records;',files.size,'uploaded files.');
