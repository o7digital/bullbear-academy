// Fill missing source metadata once; preserve anything already edited in the Studio.
import {readFile} from 'node:fs/promises';
import {hashSource,locales} from './studio/content.mjs';
const base=process.env.PUBLIC_URL,token=process.env.ADMIN_TOKEN;
if(base!=='https://directus-dev-3e70.up.railway.app'||!token)throw new Error('Use Bull Academy dev credentials.');
async function api(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error('CMS request failed: '+r.status);return(await r.json()).data;}
const source=JSON.parse(await readFile('cms/source-content.json','utf8'));
const rows=await api('/items/academy_content?limit=-1');
for(const row of rows.filter(r=>r.kind==='course'&&!r.currency)){const original=source.courses.find(c=>c.id===row.id);if(original?.currency&&original.source_price===row.source_price){await api('/items/academy_content/'+row.id,'PATCH',{currency:original.currency});console.log('Confirmed source currency:',row.id,original.currency);}}
const dictionaries={};for(const l of locales.filter(l=>l!=='es'))dictionaries[l]=JSON.parse(await readFile('src/i18n/'+l+'.json','utf8'));
for(const row of rows.filter(r=>r.kind==='text'&&r.value===r.key&&r.source_hash===hashSource(r))){if(locales.filter(l=>l!=='es').some(l=>!Object.hasOwn(dictionaries[l],row.key))){await api('/items/academy_content/'+row.id,'PATCH',{source_hash:'',status:'draft'});console.log('Queued translation for UI label:',row.key);}}
