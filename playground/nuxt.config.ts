export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },

  domainDrivenConfig: {
    directory: 'src',
    domains: {
      
    domainPathAlias: {
      Hello: 'test',
    },
    }
  },

  compatibilityDate: '2024-07-31',
})
