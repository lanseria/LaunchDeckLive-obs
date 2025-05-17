// i18n.config.ts
export default defineI18nConfig(() => ({
  legacy: false, // Use Composition API
  locale: 'zh', // Default locale (can also be set in nuxt.config)
  fallbackLocale: 'en', // Fallback locale
  // You can add global messages here if needed
  // messages: {
  //   en: { welcome: 'Welcome' },
  //   zh: { welcome: '欢迎' }
  // }
}))
