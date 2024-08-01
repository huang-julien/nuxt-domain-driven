<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# @huang-julien/nuxt-domain-driven

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A hyper opiniated module for another nuxt directory structure.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
  <!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/my-module?file=playground%2Fapp.vue) -->
  <!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add @huang-julien/nuxt-domain-driven
```

## Feature

This modules augment the architecture of nuxt.

It will read the `domainDirectory` (`src` by default) and auto-import files in each directories following the nuxt directory structure.

### directories

- components
- composables
- pages
- utils

### Prefix

#### Components

Components name are prefixed with the Domain's name. For example:

`src/Marketing/components/SomeComponent.vue`

```html
<template>
  <MarketingSomeComponent />
</template>
```

#### Pages

Pages paths are prefixed with the domain's name. For example:

The route of `src/Payments/pages/some-page.vue` will be `/Payments/some-page`.

If you need to map the name to another path, you can use `domains.domainPathAlias`.

When defining

```ts
export default defineNuxtModule({
  modules: ["@huang-julien/nuxt-domain-driven"],
  domainDrivenConfig: {
    domains: {
      domainPathAlias: {
        Payments: "/p",
      },
    },
  },
});
```

`src/Payments/pages/some-page.vue` will be accessible at `/p/some-page`

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/my-module/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/my-module
[npm-downloads-src]: https://img.shields.io/npm/dm/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/my-module
[license-src]: https://img.shields.io/npm/l/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/my-module
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
