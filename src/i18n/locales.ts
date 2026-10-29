export const locales = ['es', 'en', 'ru', 'zh', 'de', 'it', 'fr', 'pt'] as const;
export type Locale = typeof locales[number];
export const languageNames: Record<Locale, string> = {
  es: 'Español', en: 'English', ru: 'Русский', zh: '中文',
  de: 'Deutsch', it: 'Italiano', fr: 'Français', pt: 'Português',
};
export const languageTags: Record<Locale, string> = {
  es: 'es', en: 'en', ru: 'ru', zh: 'zh-Hans', de: 'de', it: 'it', fr: 'fr', pt: 'pt-BR',
};
export const speechTags: Record<Locale, string> = {
  es: 'es-MX', en: 'en-US', ru: 'ru-RU', zh: 'zh-CN', de: 'de-DE', it: 'it-IT', fr: 'fr-FR', pt: 'pt-BR',
};
