import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import Stripe from 'stripe';

test('Studio protects content and files; signed Stripe events update a single order',async t=>{
 const orders=new Map();const adminToken='fixture-directus-access-private';
 const cms=createServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c;const input=raw?JSON.parse(raw):{};let data;
  if(req.url==='/auth/login'){if(input.password!=='correct'){res.writeHead(401);return res.end('{}');}data={access_token:adminToken,refresh_token:'fixture-refresh-private',expires:900000};}
  else if(req.headers.authorization!=='Bearer '+adminToken&&req.headers.authorization!=='Bearer fixture-commerce-private'){res.writeHead(401);return res.end('{}');}
  else if(req.url.startsWith('/users/me'))data={id:'editor',email:'editor@example.com',first_name:'Editor'};
  else if(req.url.startsWith('/items/academy_content'))data=[];
  else if(req.url.startsWith('/items/academy_orders')){
   if(req.method==='GET'){data=orders.get(req.url.split('/').at(-1));if(!data){res.writeHead(404);return res.end('{}');}}
   else {const id=input.id||req.url.split('/').at(-1);data={...orders.get(id),...input};orders.set(id,data);}
  }else if(req.url==='/auth/logout')data=null;
  else{res.writeHead(404);return res.end('{}');}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data}));
 });await new Promise(r=>cms.listen(0,'127.0.0.1',r));t.after(()=>cms.close());
 const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:String(port),NODE_ENV:'test',DIRECTUS_URL:'http://127.0.0.1:'+cms.address().port,STUDIO_ORIGIN:origin,STUDIO_PREVIEW_URL:'https://academy-dev.example.com',STUDIO_SESSION_SECRET:'fixture-studio-session-secret-32-characters',STUDIO_CONTENT_TOKEN:'fixture-commerce-private',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_CHECKOUT_ENABLED:'false'},stdio:'ignore'});t.after(()=>child.kill());
 for(let attempt=0;attempt<100;attempt++){try{if((await fetch(origin+'/health')).ok)break;}catch{}await pause(30);}
 const post=(path,data,headers={})=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(data)});
 assert.equal((await fetch(origin+'/api/content')).status,401);
 assert.equal((await fetch(origin+'/api/asset/c7978f50-bc32-4ab1-b8bb-94bdb505bd27')).status,401);
 assert.equal((await post('/api/login',{email:'editor@example.com',password:'correct'},{Origin:'https://attacker.example'})).status,403);
 const login=await post('/api/login',{email:'editor@example.com',password:'correct'});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);assert.ok(!cookie.includes(adminToken));assert.ok(!(await login.text()).includes(adminToken));
 const session=await fetch(origin+'/api/session',{headers:{Cookie:cookie}});assert.equal(session.status,200);const text=await session.text();assert.ok(!text.includes('private'));assert.equal((await fetch(origin+'/api/content',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await fetch(origin+'/api/content',{headers:{Cookie:cookie.replace(/.$/,'!')}})).status,401);
 assert.equal((await post('/api/publish',{}, {Cookie:cookie,Origin:'https://attacker.example'})).status,403);
 assert.equal((await fetch(origin+'/server.mjs')).status,404);
 assert.equal((await fetch(origin+'/commerce/status')).status,200);
 assert.equal((await post('/commerce/checkout',{course:'course-1',amount:1},{Origin:'https://academy-dev.example.com'})).status,503);
 assert.equal((await post('/commerce/checkout',{course:'course-1'},{Origin:'https://attacker.example'})).status,403);
 const stripe=new Stripe('sk_test_fixture');
 async function webhook(id,type,status){const payload=JSON.stringify({id,object:'event',livemode:false,type,data:{object:{id:'cs_test_order1',metadata:{course_id:'course-1',course_title:'Forex'},amount_total:1590000,currency:'mxn',payment_status:status,customer_details:{email:'buyer@example.com'}}}});const signature=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'});return fetch(origin+'/commerce/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature},body:payload});}
 assert.equal((await post('/commerce/webhook',{type:'checkout.session.completed'})).status,400);
 assert.equal((await webhook('evt_one','checkout.session.completed','paid')).status,200);
 assert.equal((await webhook('evt_one','checkout.session.completed','paid')).status,200);
 assert.equal(orders.size,1);assert.equal(orders.get('cs_test_order1').amount,1590000);assert.equal(orders.get('cs_test_order1').payment_status,'paid');
 assert.equal((await webhook('evt_late','checkout.session.async_payment_failed','unpaid')).status,200);assert.equal(orders.get('cs_test_order1').payment_status,'paid');
 const livePayload=JSON.stringify({id:'evt_live',livemode:true,type:'checkout.session.completed',data:{object:{}}});const liveSignature=stripe.webhooks.generateTestHeaderString({payload:livePayload,secret:'whsec_fixture'});assert.equal((await fetch(origin+'/commerce/webhook',{method:'POST',headers:{'Stripe-Signature':liveSignature},body:livePayload})).status,400);
});
