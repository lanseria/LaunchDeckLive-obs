// app/composables/useHost.ts
export function useHost() {
  if (import.meta.server) {
    const headers = useRequestHeaders()
    return headers.host || 'localhost:3000'
  }
  return window.location.origin
}

// nuxt.config.ts
export default defineNuxtConfig({
  // ...
  imports: {
    // ...
    injectAtEnd: true,
  },
  vue: {
    compilerOptions: {
      isCustomElement: tag => tag === '$host',
    },
  },
})
