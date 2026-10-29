const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const ui=JSON.parse(document.body.dataset.ui);
const pluralRules=new Intl.PluralRules(document.documentElement.lang);
const menu=$('.menu-toggle'),mobile=$('#mobile-nav');
function closeMenu(){menu?.setAttribute('aria-expanded','false');if(mobile)mobile.hidden=true;}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));mobile.hidden=open;});
$$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));
window.matchMedia('(min-width:1001px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();$$('.nav-dropdown').forEach(d=>d.open=false);}});
let lastFocus;
function showDialog(dialog){lastFocus=document.activeElement;closeMenu();dialog.showModal();document.body.classList.add('dialog-open');}
$$('dialog').forEach(d=>{$('.dialog-close',d)?.addEventListener('click',()=>d.close());d.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastFocus?.focus();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$$('[data-contact]').forEach(b=>b.addEventListener('click',()=>{$('#contact-form').hidden=false;$('#contact-review').hidden=true;showDialog($('#contact-dialog'));}));
$('#concept-info')?.addEventListener('click',()=>showDialog($('#about-dialog')));
$('#contact-form')?.addEventListener('submit',e=>{e.preventDefault();const n=$('#contact-name'),name=n.value.trim();if(!name){n.setCustomValidity(ui.requiredName);n.reportValidity();return;}const values={name,level:$('#contact-level').value,interest:$('#contact-interest').value};const message=ui.inquiry.replace(/\{(name|level|interest)\}/g,(_,key)=>values[key]);$('#review-message').textContent=message;$('#whatsapp-link').href='https://wa.me/525564304548?text='+encodeURIComponent(message);$('#contact-form').hidden=true;$('#contact-review').hidden=false;$('#whatsapp-link').focus();});
$('#contact-name')?.addEventListener('input',()=>$('#contact-name').setCustomValidity(''));
$('#edit-message')?.addEventListener('click',()=>{$('#contact-form').hidden=false;$('#contact-review').hidden=true;$('#contact-name').focus();});
$$('[data-category]').forEach(b=>b.addEventListener('click',()=>{$$('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));let count=0;$$('[data-course-category]').forEach(c=>{c.hidden=b.dataset.category!=='Todos'&&c.dataset.courseCategory!==b.dataset.category;if(!c.hidden)count++;});$('#course-count').textContent=(ui.courseCount[pluralRules.select(count)]??ui.courseCount.other).replace('{count}',String(count));}));
