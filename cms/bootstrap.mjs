import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {hashSource,sections,locales} from './studio/content.mjs';

const base=process.env.DIRECTUS_URL||process.env.PUBLIC_URL;
const token=process.env.ADMIN_TOKEN;
if(base!=='https://directus-dev-3e70.up.railway.app'||!token)throw new Error('Use the Bull Academy dev CMS and its ADMIN_TOKEN.');
async function api(path,method='GET',body){const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const result=await response.json();if(!response.ok)throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(result.errors)}`);return result.data;}
const field=(name,type='string',extra={})=>({field:name,type,schema:{is_nullable:true,...(type==='string'?{max_length:2000}:{}),...extra.schema},meta:{interface:type==='text'?'input-multiline':type==='json'?'input-code':'input',width:'full',...extra.meta}});
const id=field('id','string',{schema:{is_primary_key:true,is_nullable:false,max_length:200},meta:{hidden:true}});
const definitions={
 academy_content:{label:'Contenido de la academia',icon:'school',fields:[id,field('kind'),field('section'),field('key','text'),field('title'),field('body','text'),field('value','text'),field('status','string',{schema:{default_value:'draft'},meta:{interface:'select-dropdown',options:{choices:[{text:'Borrador',value:'draft'},{text:'Publicado',value:'published'},{text:'Archivado',value:'archived'}]}}}),field('sort','integer'),field('image'),field('video'),field('url'),field('date','date'),field('category'),field('duration'),field('mentor'),field('source_price'),field('currency'),field('stripe_price_id'),field('source_hash'),field('translations','json')]},
 academy_orders:{label:'Pedidos Stripe · Pruebas',icon:'shopping_bag',fields:[id,field('course_id'),field('course_title'),field('amount','integer'),field('currency'),field('email'),field('payment_status'),field('stripe_event')]},
};
const collections=await api('/collections');
for(const [name,definition]of Object.entries(definitions)){
 if(!collections.some(c=>c.collection===name))await api('/collections','POST',{collection:name,schema:{},meta:{icon:definition.icon,display_template:'{{title}}',translations:[{language:'es-ES',translation:definition.label}]},fields:definition.fields});
 else {const current=await api('/fields/'+name);for(const f of definition.fields)if(!current.some(x=>x.field===f.field))await api('/fields/'+name,'POST',f);}
}
await api('/settings','PATCH',{project_name:'Bull Academy Studio',project_color:'#E25814',default_language:'es-ES'});
const stable=value=>'bba-'+createHash('sha256').update(value).digest('hex').slice(0,28);
const dictionaries={};for(const locale of locales.filter(l=>l!=='es'))dictionaries[locale]=JSON.parse(await readFile(`src/i18n/${locale}.json`,'utf8'));
const textSections=new Map();
const pageSection={'index.astro':'inicio','nosotros.astro':'nosotros','trading-club.astro':'trading-club','videos.astro':'videos','aprende-lo-fundamental-del-trading.astro':'webinars','guerra-de-traders.astro':'guerra-de-traders','proximos-eventos.astro':'eventos','contacto.astro':'contacto','preguntas-frecuentes-faq.astro':'faq','FAQ.astro':'faq','Mentors.astro':'mentores','Session.astro':'contacto'};
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isDirectory())await scan(dir+'/'+entry.name);else if(/\.(astro|ts)$/.test(entry.name)){const source=await readFile(dir+'/'+entry.name,'utf8');for(const m of source.matchAll(/\bt\(\s*("(?:\\.|[^"\\])*")\s*\)/g)){const key=JSON.parse(m[1]);if(!textSections.has(key))textSections.set(key,pageSection[entry.name]||'ajustes');}}}}
await scan('src');
for(const key of Object.keys(dictionaries.en))if(!textSections.has(key))textSections.set(key,'ajustes');
const records=[];
for(const[key,section]of textSections){const incomplete=locales.filter(l=>l!=='es').some(l=>!Object.hasOwn(dictionaries[l],key));const row={id:stable('text:'+key),kind:'text',key,section,value:key,title:'',body:'',status:incomplete?'draft':'published',sort:records.length,translations:Object.fromEntries(locales.filter(l=>l!=='es').map(l=>[l,{value:dictionaries[l][key]||key,title:'',body:''}]))};row.source_hash=incomplete?'':hashSource(row);records.push(row);}
const source=JSON.parse(await readFile('cms/source-content.json','utf8'));
for(const page of source.pages){if(!page.body)continue;records.push({id:stable('page:'+page.id),kind:'page',section:page.section,title:page.title,body:page.body,value:'',url:page.url,status:'draft',sort:records.length,translations:{}});
 for(const[sort,image]of page.images.entries())records.push({id:stable('image:'+page.section+image),kind:'media',section:page.section,title:page.title,image,body:'',value:'',sort,status:'draft',translations:{}});
 for(const[sort,video]of page.youtube_ids.entries())records.push({id:stable('video:'+page.section+video),kind:'media',section:page.section,title:page.section==='inicio'&&video==='zT8i84q4kDk'?'Vídeo principal · Trading Club':page.title+' · '+(sort+1),video,body:'',value:'',sort,status:'draft',translations:{}});
}
for(const course of source.courses){const row={id:course.slug,kind:'course',section:'cursos',title:course.title,body:course.body,value:'',image:course.image,url:course.official,category:course.category,duration:course.duration,mentor:course.mentor,source_price:course.source_price,currency:course.currency,stripe_price_id:'',status:'draft',sort:records.length,translations:{}};records.push(row);}
const mentors=[['José Luis Morales','Forex','jose-luis'],['Joaquín Alducín','Opciones & futuros','joaquin'],['Edgar Ulises','Futuros','edgar'],['Luis González','Criptomonedas','luis'],['Raúl Valdez','Forex','raul'],['Héctor Rojas','Futuros & acciones','hector']];
for(const[sort,[title,body,image]]of mentors.entries()){const row={id:'mentor-'+image,kind:'mentor',section:'mentores',title,body,value:'',image:'/assets/'+image+'.jpg',status:'published',sort,translations:Object.fromEntries(locales.filter(l=>l!=='es').map(l=>[l,{title,body:dictionaries[l][body]||body,value:''}]))};row.source_hash=hashSource(row);records.push(row);}
for(const [id,section,title,image]of [['site-hero','inicio','Imagen principal','/assets/hero.webp'],['site-logo','ajustes','Logo de la academia','/assets/logo-official.png']]){const row={id,section,title,image,kind:'media',body:'',value:'',status:'published',sort:-1,translations:Object.fromEntries(locales.filter(l=>l!=='es').map(l=>[l,{title,body:'',value:''}]))};row.source_hash=hashSource(row);records.push(row);}
const current=new Set((await api('/items/academy_content?fields=id&limit=-1')).map(r=>r.id));
const missing=records.filter(r=>!current.has(r.id));for(let i=0;i<missing.length;i+=75)await api('/items/academy_content','POST',missing.slice(i,i+75));
console.log('Content records:',records.length,'Added:',missing.length);

const policies=await api('/policies?limit=-1');
async function policy(name){return policies.find(x=>x.name===name)||api('/policies','POST',{name,icon:'public',admin_access:false,app_access:false});}
const reader=await policy('Bull Academy website build'),studio=await policy('Bull Academy commerce service'),editor=await policy('Bull Academy editor');
const permissions=await api('/permissions?limit=-1');
async function permission(p,collection,action,fields=['*']){if(!permissions.some(r=>r.policy===p.id&&r.collection===collection&&r.action===action))await api('/permissions','POST',{policy:p.id,collection,action,permissions:{},fields});}
await permission(reader,'academy_content','read');await permission(reader,'directus_files','read');
for(const action of ['read','create','update'])await permission(studio,'academy_orders',action);
await permission(studio,'academy_content','read');
for(const action of ['read','create','update'])await permission(editor,'academy_content',action);
for(const action of ['read','create','update','delete'])await permission(editor,'directus_files',action);
await permission(editor,'directus_folders','read');await permission(editor,'academy_orders','read');
const roles=await api('/roles?limit=-1');
const users=await api('/users?fields=id,email,first_name&limit=-1');
async function identity(name,p,tokenValue){let role=roles.find(r=>r.name===name);if(!role)role=await api('/roles','POST',{name,icon:'public',policies:[{policy:p.id}]});if(tokenValue&&!users.some(u=>u.first_name===name))await api('/users','POST',{first_name:name,role:role.id,status:'active',token:tokenValue});return role;}
await identity('Bull Academy website build',reader,process.env.WEBSITE_READ_TOKEN);
await identity('Bull Academy commerce service',studio,process.env.STUDIO_CONTENT_TOKEN);
const editorRole=await identity('Bull Academy editor',editor);
console.log('Editorial role ready:',editorRole.id);
console.log('Seed complete. Existing editorial records were preserved. Imported source records need translation before publication.');
