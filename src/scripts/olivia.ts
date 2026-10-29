export {};
import { locales, languageTags, speechTags, type Locale } from '../i18n/locales';
type Message = { role: 'user' | 'assistant' | 'operator'; content: string; id?: string };
type Session = { visitorId: string; consent: boolean; consentAt: string; open: boolean; language: Locale; siteLanguage: Locale; draft: string; messages: Message[] };
const root = document.querySelector<HTMLElement>('[data-olivia]');
if (root) {
  const api = 'https://olivia-ai.o7digital.com';
  const clientCode = 'bullbear';
  const storageKey = 'bullbear:olivia:3.5';
  const languages: readonly Locale[] = locales;
  const siteLanguage = root.dataset.language as Locale;
  const copies = JSON.parse(root.dataset.copy!);
  const panel = root.querySelector<HTMLDialogElement>('.olivia-panel')!;
  const launch = root.querySelector<HTMLButtonElement>('[data-olivia-open]')!;
  const close = root.querySelector<HTMLButtonElement>('[data-olivia-close]')!;
  const log = root.querySelector<HTMLElement>('[data-olivia-log]')!;
  const form = root.querySelector<HTMLFormElement>('[data-olivia-form]')!;
  const input = root.querySelector<HTMLTextAreaElement>('[data-olivia-input]')!;
  const consent = root.querySelector<HTMLInputElement>('[data-olivia-consent]')!;
  const languageSelect = root.querySelector<HTMLSelectElement>('[data-olivia-language]')!;
  const send = root.querySelector<HTMLButtonElement>('[data-olivia-send]')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-olivia-reset]')!;
  const mic = root.querySelector<HTMLButtonElement>('[data-olivia-mic]')!;
  const feedback = root.querySelector<HTMLElement>('[data-olivia-feedback]')!;
  const contact = root.querySelector<HTMLAnchorElement>('[data-olivia-contact]')!;
  const suggestions = [...root.querySelectorAll<HTMLButtonElement>('[data-olivia-prompt]')];
  let session: Session = { visitorId: crypto.randomUUID(), consent: false, consentAt: '', open: false, language: siteLanguage, siteLanguage, draft: '', messages: [] };
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && /^[a-zA-Z0-9_-]{1,80}$/.test(saved.visitorId) && Array.isArray(saved.messages)) {
      session = { ...session, visitorId: saved.visitorId, consent: saved.consent === true, consentAt: typeof saved.consentAt === 'string' ? saved.consentAt : '', open: saved.open === true,
        language: saved.siteLanguage === siteLanguage && languages.includes(saved.language) ? saved.language : siteLanguage,
        draft: typeof saved.draft === 'string' ? saved.draft.slice(0, 4000) : '',
        messages: saved.messages.filter((m: Message) => ['user', 'assistant', 'operator'].includes(m?.role) && typeof m.content === 'string' && m.content.trim() && m.content.length <= 12000).slice(-24),
      };
    }
  } catch { /* Session storage is optional. */ }
  let copy = copies[session.language];
  let busy = false;
  let polling = false;
  let identity = '';
  let identityExpires = 0;
  let inactivityTimer: number;
  let activeRequest: AbortController | undefined;
  let recognition: any;
  let feedbackKey = '';
  function save() { try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Keep chat usable without storage. */ } }
  function status(key = '', error = false) {
    feedbackKey = key;
    feedback.textContent = key ? copy[key] : '';
    feedback.dataset.error = String(error);
  }
  function append(message: Message) {
    const article = document.createElement('article');
    article.className = 'olivia-message'; article.dataset.role = message.role;
    const author = document.createElement('b'); author.textContent = message.role === 'user' ? copy.you : 'Olivia';
    const paragraph = document.createElement('p');
    // Format only explicit bold and HTTP(S) links; model output never becomes HTML.
    const pattern = /\[[^\]\n]+\]\(https?:\/\/[^\s<>"\)]+\)|https?:\/\/[^\s<>"\]\)]+|\*\*[^*\n]+\*\*/g;
    let end = 0;
    for (const match of message.content.matchAll(pattern)) {
      paragraph.append(document.createTextNode(message.content.slice(end, match.index)));
      if (match[0].startsWith('**')) {
        const strong = document.createElement('strong'); strong.textContent = match[0].slice(2, -2); paragraph.append(strong);
      } else {
        const markdown = match[0].match(/^\[([^\]]+)\]\((https?:\/\/.+)\)$/);
        const link = document.createElement('a');
        link.href = markdown?.[2] || match[0]; link.textContent = markdown?.[1] || match[0];
        link.target = '_blank'; link.rel = 'noopener noreferrer'; paragraph.append(link);
      }
      end = match.index! + match[0].length;
    }
    paragraph.append(document.createTextNode(message.content.slice(end)));
    article.append(author, paragraph); log.append(article);
    log.scrollTop = log.scrollHeight;
  }
  function render() {
    log.replaceChildren(); append({ role: 'assistant', content: copy.greeting }); session.messages.forEach(append);
  }
  function controls() {
    send.disabled = busy || !session.consent;
    reset.disabled = busy; languageSelect.disabled = busy; input.readOnly = busy;
    mic.disabled = busy || !session.consent;
    suggestions.forEach(button => button.disabled = busy || !session.consent);
    form.setAttribute('aria-busy', String(busy));
  }
  function translate() {
    copy = copies[session.language];
    root!.querySelectorAll<HTMLElement>('[data-olivia-text]').forEach(node => node.textContent = copy[node.dataset.oliviaText!]);
    panel.lang = languageTags[session.language];
    root!.dataset.currentLanguage = session.language;
    launch.setAttribute('aria-label', copy.open); close.setAttribute('aria-label', copy.close);
    languageSelect.setAttribute('aria-label', copy.language); languageSelect.value = session.language;
    input.placeholder = copy.placeholder; input.setAttribute('aria-label', copy.placeholder);
    send.setAttribute('aria-label', copy.send); mic.setAttribute('aria-label', copy.mic);
    status(feedbackKey, feedback.dataset.error === 'true');
    render(); controls();
  }
  function open() {
    if (!panel.open) panel.show();
    session.open = true; save(); launch.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true }); log.scrollTop = log.scrollHeight;
  }
  launch.addEventListener('click', () => panel.open ? panel.close() : open());
  close.addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => { session.open = false; save(); recognition?.stop(); launch.setAttribute('aria-expanded', 'false'); launch.focus({ preventScroll: true }); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.open) { event.preventDefault(); panel.close(); } });
  consent.checked = session.consent; input.value = session.draft;
  consent.addEventListener('change', () => { session.consent = consent.checked; session.consentAt = consent.checked ? new Date().toISOString() : ''; if (!consent.checked) recognition?.stop(); save(); controls(); });
  input.addEventListener('input', () => { session.draft = input.value; save(); input.style.height = '46px'; input.style.height = `${Math.min(input.scrollHeight, 115)}px`; });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
  languageSelect.addEventListener('change', () => { if (languages.includes(languageSelect.value as Locale)) { recognition?.stop(); session.language = languageSelect.value as Locale; save(); translate(); } });
  reset.addEventListener('click', () => {
    if (busy) return;
    session.messages = []; session.visitorId = crypto.randomUUID(); session.draft = ''; input.value = ''; contact.hidden = true;
    status(); save(); render(); input.focus({ preventScroll: true });
  });
  suggestions.forEach(button => button.addEventListener('click', () => { input.value = copy[button.dataset.oliviaPrompt!]; form.requestSubmit(); }));
  async function request(path: string, method = 'GET', payload?: unknown) {
    const controller = new AbortController(); activeRequest = controller;
    const timer = window.setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(api + path, {
        method, headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(identity && !path.startsWith('/api/widget/identity') ? { 'X-Olivia-Widget-Identity': identity } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}), cache: 'no-store', credentials: 'omit', signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) { identity = ''; identityExpires = 0; } throw new Error('Olivia request failed'); }
      return data;
    } finally { window.clearTimeout(timer); if (activeRequest === controller) activeRequest = undefined; }
  }
  async function identify() {
    if (identity && Date.now() < identityExpires) return;
    const data = await request('/api/widget/identity');
    if (data.clientCode !== clientCode || typeof data.identity !== 'string') throw new Error('Unexpected client');
    identity = data.identity; identityExpires = Date.now() + 50 * 60 * 1000;
  }
  async function sync() {
    if (!panel.open || busy || polling || !session.consent || !session.messages.length || document.hidden) return;
    polling = true;
    try {
      await identify();
      const data = await request('/api/widget/conversations?' + new URLSearchParams({ clientCode, visitorId: session.visitorId }));
      if (data.status === 'manual') status('manual');
      else if (feedbackKey === 'manual') status();
      let changed = false;
      for (const message of data.messages || []) {
        if (message.role === 'operator' && typeof message.id === 'string' && typeof message.content === 'string' && !session.messages.some(m => m.id === message.id)) {
          session.messages.push({ role: 'operator', id: message.id, content: message.content }); changed = true;
        }
      }
      if (changed) { session.messages = session.messages.slice(-24); save(); render(); }
    } catch { /* A polling outage does not interrupt an existing conversation. */ }
    finally { polling = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const message = input.value.trim();
    if (!message || busy || !session.consent) return;
    recognition?.stop(); busy = true; controls(); status('thinking'); contact.hidden = true;
    const history = session.messages.map(({ role, content }) => ({ role: role === 'operator' ? 'assistant' : role, content })).slice(-12);
    session.draft = message; save(); append({ role: 'user', content: message }); input.value = '';
    const language = session.language;
    const metadata = { language, pageUrl: location.href, pageTitle: document.title, pageContent: document.querySelector('main')?.textContent?.replace(/\s+/g, ' ').slice(0, 5000) || '', dataConsent: true, dataConsentAt: session.consentAt, consentVersion: 'bullbear-olivia-3.5-2026-10-28' };
    const common = { clientCode, visitorId: session.visitorId, language, source: 'website', metadata };
    try {
      await identify();
      const stored = await request('/api/widget/conversations', 'POST', { ...common, content: message });
      if (stored?.conversation?.status === 'manual') {
        session.messages.push({ role: 'user', content: message }); session.draft = ''; save(); status('manual'); return;
      }
      const answer = await request('/api/olivia/chat', 'POST', { ...common, message, history });
      if (answer.clientCode !== clientCode || answer.language !== language || !answer.model || typeof answer.reply !== 'string' || !answer.reply.trim()) throw new Error('Unexpected reply');
      session.messages.push({ role: 'user', content: message }, { role: 'assistant', content: answer.reply });
      session.messages = session.messages.slice(-24); session.draft = ''; save(); render(); status();
      contact.hidden = !answer.handoffRecommended;
      await request('/api/widget/conversations', 'PATCH', { ...common, content: answer.reply, model: answer.model }).catch(() => {});
    } catch {
      render(); input.value = message; status('error', true); contact.hidden = false;
    } finally { busy = false; controls(); if (panel.open) input.focus({ preventScroll: true }); }
  });
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) {
    mic.hidden = false;
    mic.addEventListener('click', () => {
      if (busy || !session.consent) return;
      if (mic.getAttribute('aria-pressed') === 'true') { recognition?.stop(); return; }
      recognition = new SpeechRecognition(); recognition.lang = speechTags[session.language];
      recognition.interimResults = false;
      recognition.onstart = () => { mic.setAttribute('aria-pressed', 'true'); status('listening'); };
      recognition.onend = () => { mic.setAttribute('aria-pressed', 'false'); if (feedbackKey === 'listening') status(); };
      recognition.onerror = () => { mic.setAttribute('aria-pressed', 'false'); status('micError', true); };
      recognition.onresult = (event: any) => { input.value = `${input.value} ${event.results[0][0].transcript}`.trim().slice(0, 4000); session.draft = input.value; save(); };
      try { recognition.start(); } catch { status('micError', true); }
    });
  }
  const markActive = () => {
    root!.dataset.idle = 'false';
    const label = root!.querySelector<HTMLElement>('.olivia-presence span')!; label.textContent = copy.available;
    window.clearTimeout(inactivityTimer);
    inactivityTimer = window.setTimeout(() => { root!.dataset.idle = 'true'; label.textContent = copy.idle; }, 45000);
  };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(event => document.addEventListener(event, markActive, { passive: true }));
  const pollTimer = window.setInterval(sync, 8000);
  window.addEventListener('pagehide', () => { activeRequest?.abort(); recognition?.stop(); window.clearInterval(pollTimer); window.clearTimeout(inactivityTimer); });
  translate(); markActive(); save(); if (session.open) open();
}
