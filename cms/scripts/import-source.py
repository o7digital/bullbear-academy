"""Read-only import of the Academy's public WordPress pages. Requires beautifulsoup4."""
import concurrent.futures, hashlib, json, pathlib, re, subprocess
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = 'https://www.bullandbear-academy.com'
ASSETS = ROOT / 'public/assets/official'
ASSETS.mkdir(parents=True, exist_ok=True)
PAGES = {'inicio':'/', 'nosotros':'/nosotros/', 'trading-club':'/trading-club/', 'videos':'/videos/', 'webinars':'/aprende-lo-fundamental-del-trading/', 'guerra-de-traders':'/guerra-de-traders/', 'eventos':'/proximos-eventos/', 'contacto':'/contacto/', 'faq':'/preguntas-frecuentes-faq/', 'privacidad':'/aviso-de-privacidad/'}

def fetch(url):
    result = subprocess.run(['curl','--fail','-L','-s','--max-time','50',url],capture_output=True)
    if result.returncode: raise RuntimeError('Source unavailable: '+url)
    return result.stdout

def media(url):
    url = urljoin(BASE,url)
    if urlparse(url).hostname != 'www.bullandbear-academy.com': return ''
    extension = pathlib.Path(urlparse(url).path).suffix.lower()
    if extension not in ['.jpg','.jpeg','.png','.webp','.gif','.svg','.mp4','.pdf']: return ''
    filename = hashlib.sha256(url.encode()).hexdigest()[:16]+extension
    path = ASSETS / filename
    if not path.exists(): path.write_bytes(fetch(url))
    return '/assets/official/'+filename

def page(entry):
    section, path = entry
    try: raw = fetch(BASE+path)
    except RuntimeError:
        if section != 'videos': raise
        print('videos: source route unavailable; existing links preserved',flush=True)
        return {'id':section,'section':section,'title':'Videos','body':'','url':BASE+path,'images':[],'youtube_ids':[],'source_blocks':[],'unavailable':True}
    soup = BeautifulSoup(raw,'html.parser')
    for element in soup.select('header,footer,nav,script,style,.elementor-location-header,.elementor-location-footer,.chaty-widget,.cky-consent-container'): element.decompose()
    widgets = soup.select('.elementor-widget-heading,.elementor-widget-text-editor,.elementor-widget-accordion,.elementor-widget-toggle,.elementor-widget-icon-list,.elementor-widget-icon-box,.elementor-widget-image-box')
    rows, seen = [],set()
    for widget in widgets:
        text = widget.get_text('\n',strip=True)
        if len(text)<4 or text in seen: continue
        seen.add(text)
        # The site uses empty layout headings and repeated responsive blocks.
        if text.lower() in ['traders graduados']: continue
        heading = widget.select_one('h1,h2,h3,h4')
        rows.append({'title':heading.get_text(' ',strip=True) if heading else '', 'body':'' if heading and text==heading.get_text('\n',strip=True) else text})
    if not rows:
        content=soup.select_one('main,.entry-content,article')
        if content:
            for element in content.select('h1,h2,h3,p,li'):
                text=element.get_text(' ',strip=True)
                if text and text not in seen:
                    seen.add(text); rows.append({'title':text if element.name.startswith('h') else '', 'body':text if not element.name.startswith('h') else ''})
    images=[]
    for img in soup.select('.elementor-widget-image img'):
        url=img.get('data-src') or img.get('src','')
        if '/wp-content/uploads/' in url and not any(x in url.lower() for x in ['logo','icon','whatsapp']):
            try:
                local=media(url)
                if local and local not in images: images.append(local)
            except RuntimeError: pass
    videos=[]
    for element in soup.select('iframe,[data-settings],a[href]'):
        raw=(element.get('src','')+' '+element.get('data-settings','')+' '+element.get('href','')).replace('\\/','/')
        for match in re.finditer(r'(?:youtube\.com/(?:embed/|watch\?v=)|youtu\.be/)([\w-]{11})',raw):
            if match[1] not in videos: videos.append(match[1])
    print(section,len(rows),'text blocks',len(images),'images',len(videos),'videos',flush=True)
    return {'id':section,'section':section,'title':{'inicio':'La academia','webinars':'Webinars','eventos':'Eventos','faq':'Preguntas frecuentes','privacidad':'Aviso de privacidad'}.get(section,section.replace('-',' ').title()),'body':'\n\n'.join((r['title']+'\n'+r['body']).strip() for r in rows),'url':BASE+path,'images':images,'youtube_ids':videos,'source_blocks':rows}

def course(original):
    soup=BeautifulSoup(fetch(original['official']),'html.parser')
    summary=soup.select_one('.summary')
    short=soup.select_one('.woocommerce-product-details__short-description')
    description=soup.select_one('#tab-description')
    title=soup.select_one('h1.product_title')
    price=summary.select_one('.price .woocommerce-Price-amount') if summary else None
    symbol=price.select_one('.woocommerce-Price-currencySymbol').get_text(strip=True) if price and price.select_one('.woocommerce-Price-currencySymbol') else ''
    amount=re.sub(r'[^\d.]','',price.get_text(strip=True)) if price else ''
    body=short.get_text('\n',strip=True) if short else ''
    detail=description.get_text('\n',strip=True) if description else ''
    if detail.startswith('Description\n'): detail=detail[len('Description\n'):]
    if detail and detail not in body: body+='\n\n'+detail
    img=soup.select_one('.woocommerce-product-gallery img')
    image=media(img.get('data-large_image') or img.get('src')) if img else ''
    currency_match=re.search(r'priceCurrency\\?"\s*:\s*\\?"([A-Z]{3})',str(soup))
    currency=currency_match[1] if currency_match else ''
    # '$' alone does not establish the currency. Checkout stays disabled until confirmed.
    result={**original,'id':original['slug'],'title':title.get_text(' ',strip=True) if title else original['title'],'body':body,'image':image,'source_price':amount,'source_currency_symbol':symbol,'currency':currency,'stripe_price_id':'','status':'published'}
    print(original['slug'],len(body),'characters',amount,symbol,flush=True)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    pages=list(pool.map(page,PAGES.items()))
    courses=list(pool.map(course,json.loads((ROOT/'src/data/courses.json').read_text())))
data={'imported_at':'2026-11-09','source':BASE,'pages':pages,'courses':courses}
(ROOT/'cms/source-content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Source import saved. Source prices retained verbatim; Stripe prices require configuration.')
