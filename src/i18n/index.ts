import english from './en.json';
import courses from '../data/courses.json';

export type Locale = 'es' | 'en';
export const getLocale = (pathname: string): Locale => pathname.startsWith('/en/') ? 'en' : 'es';
export const translator = (locale: Locale) => (text: string): string =>
  locale === 'en' ? (english as Record<string, string>)[text] ?? text : text;

const pageRoutes: Record<string, string> = {
  '/': '/en/',
  '/nosotros/': '/en/about/',
  '/trading-club/': '/en/trading-club/',
  '/videos/': '/en/videos/',
  '/aprende-lo-fundamental-del-trading/': '/en/webinars/',
  '/guerra-de-traders/': '/en/guerra-de-traders/',
  '/proximos-eventos/': '/en/events/',
  '/tienda/': '/en/courses/',
  '/contacto/': '/en/contact/',
  '/preguntas-frecuentes-faq/': '/en/faq/',
};
const courseSlugs: Record<string, string> = {
  'curso-de-criptomonedas-10-hrs': 'cryptocurrency-course-10-hours',
  'curso-de-criptomonedas': 'cryptocurrency-course-25-hours',
  'forex-para-todos': 'forex-for-everyone',
  'desencriptando-forex': 'decoding-forex',
  'elliott-wave-and-harmonic-patterns': 'elliott-wave-and-harmonic-patterns',
  'finanzas-para-no-financieros': 'finance-for-non-financial-professionals',
  'finanzas-personales': 'personal-finance',
  'portafolios-de-inversion': 'investment-portfolios',
  'trading-con-forex': 'forex-trading',
  'trading-con-futuros': 'futures-trading',
  'trading-options': 'options-trading',
  'value-investing': 'value-investing',
};
export const routes: Record<string, string> = {
  ...pageRoutes,
  ...Object.fromEntries(courses.map(course => [course.url, `/en/courses/${courseSlugs[course.slug]}/`])),
};
const spanishRoutes = Object.fromEntries(Object.entries(routes).map(([es, en]) => [en, es]));

export function localizePath(pathname: string, locale: Locale): string {
  const [path, fragment] = pathname.split('#');
  const spanish = spanishRoutes[path] ?? path;
  const result = locale === 'en' ? routes[spanish] ?? path : spanish;
  return result + (fragment === undefined ? '' : `#${fragment}`);
}

export function getCourses(locale: Locale) {
  const t = translator(locale);
  return courses.map(course => ({
    ...course,
    title: t(course.title),
    duration: t(course.duration),
    url: localizePath(course.url, locale),
  }));
}
