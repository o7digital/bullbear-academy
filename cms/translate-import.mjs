// One-time, resumable translation of the imported public content. No edits are overwritten.
import {translateSpanish,targetLocales} from './studio/translations.mjs';
import {hashSource,textFields} from './studio/content.mjs';
const base=process.env.PUBLIC_URL,token=process.env.ADMIN_TOKEN;
if(base!=='https://directus-dev-3e70.up.railway.app'||!token)throw new Error('Use Bull Academy dev credentials.');
async function api(path,method='GET',body){const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('CMS operation failed: '+response.status);return(await response.json()).data;}
const pending=(await api('/items/academy_content?limit=-1')).filter(row=>row.kind!=='mentor'&&(!row.source_hash||row.source_hash!==hashSource(row)));
let cursor=0;
async function worker(){while(cursor<pending.length){const row=pending[cursor++];let translations;for(let attempt=0;attempt<3;attempt++){try{const fields=row.kind==='course'?[...textFields,'duration','category']:textFields;translations=await translateSpanish(fields.map(key=>({key,value:row[key]||''})),{key:process.env.OPENAI_API_KEY});break;}catch(e){console.log(row.id,'translation attempt',attempt+1,e.message);if(attempt===2)throw e;}}
 const current=await api('/items/academy_content/'+row.id);if(hashSource(current)!==hashSource(row)){console.log('Skipped modified content',row.id);continue;}
 await api('/items/academy_content/'+row.id,'PATCH',{translations,source_hash:hashSource(row),status:'published'});console.log('Translated and published',row.kind,row.section,row.title||row.id);
}}
await Promise.all([worker(),worker()]);
console.log('Imported content translations complete:',pending.length,'records,',targetLocales.length,'languages.');
