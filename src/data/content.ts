import cms from './cms.generated.json';
import source from '../../cms/source-content.json';
export type ContentRecord={id:string;kind:string;section:string;key?:string;title?:string;body?:string;value?:string;image?:string;video?:string;url?:string;date?:string;category?:string;duration?:string;mentor?:string;source_price?:string;currency?:string;sort?:number;translations?:Record<string,Record<string,string>>};
export const records:ContentRecord[]=cms.records;
export const studioURL=cms.studio;
export const commerceURL=cms.commerce;
export const localized=(row:ContentRecord,locale:string):ContentRecord=>({...row,...(locale==='es'?{}:row.translations?.[locale]||{})});
export function contentFor(section:string,locale='es',kind?:string){return records.filter(r=>r.section===section&&(!kind||r.kind===kind)).map(r=>localized(r,locale));}
export function courseContent(slug:string,locale='es'){
 const row=records.find(r=>r.kind==='course'&&r.id===slug);
 if(row)return localized(row,locale);
 const original=source.courses.find(r=>r.slug===slug);
 return original?{...original,kind:'course',section:'cursos'}:undefined;
}
export function overrideCopy(key:string,locale:string){const row=records.find(r=>r.kind==='text'&&r.key===key);return row?(locale==='es'?row.value:row.translations?.[locale]?.value):undefined;}
