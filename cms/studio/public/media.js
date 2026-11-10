// Shared by the Studio, its API and the website. Never fetch editor-provided URLs on the server.
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export function videoDetails(input){
 const raw=String(input||'').trim();
 if(!raw)return null;
 if(uuid.test(raw))return {type:'upload',stored:raw,url:'',label:'Vídeo subido'};
 if(/^\/[a-zA-Z0-9/_\-.]+\.(mp4|webm)$/i.test(raw))return {type:'file',stored:raw,url:raw,label:'Vídeo'};
 if(/^[\w-]{11}$/.test(raw))return youtube(raw);
 let value=raw;
 if(/^(?:www\.|youtube\.com\/|m\.youtube\.com\/|youtu\.be\/|vimeo\.com\/)/i.test(value))value='https://'+value;
 let url;try{url=new URL(value);}catch{throw new Error('Pega un enlace web completo, por ejemplo https://www.youtube.com/watch?v=…');}
 if(url.protocol!=='https:'||url.username||url.password)throw new Error('Usa un enlace HTTPS público, sin usuario ni contraseña.');
 const host=url.hostname.toLowerCase();
 if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be','www.youtu.be'].includes(host)){
  const id=host.endsWith('youtu.be')?url.pathname.split('/')[1]:url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
  if(!id||!/^[\w-]{11}$/.test(id))throw new Error('El enlace de YouTube no contiene un vídeo válido.');
  return youtube(id);
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
  const match=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
  if(!match)throw new Error('Pega el enlace de un vídeo de Vimeo.');
  const hash=url.searchParams.get('h')||match[2];
  const canonical=`https://vimeo.com/${match[1]}${hash?'/'+encodeURIComponent(hash):''}`;
  return {type:'vimeo',stored:canonical,url:canonical,embed:`https://player.vimeo.com/video/${match[1]}${hash?'?h='+encodeURIComponent(hash):''}`,label:'Vimeo'};
 }
 if(/\.(?:mp4|webm)$/i.test(url.pathname))return {type:'file',stored:url.href,url:url.href,label:host};
 return {type:'link',stored:url.href,url:url.href,label:host};
}
function youtube(id){return {type:'youtube',id,stored:id,url:`https://www.youtube.com/watch?v=${id}`,embed:`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,label:'YouTube'};}
export const normalizeVideoInput=input=>videoDetails(input)?.stored||'';
export const isUploadId=value=>uuid.test(value||'');
