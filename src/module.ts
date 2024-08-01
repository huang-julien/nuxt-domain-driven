import { readdirSync, lstatSync, existsSync } from 'node:fs'
import { defineNuxtModule, addComponentsDir, addImportsDir } from '@nuxt/kit'
import { join } from 'pathe'
import { toVueRouter4 } from 'unrouting'
import type { NuxtPage } from '@nuxt/schema'

export interface ModuleOptions {
  /**
   * The directory to scan for domain-driven design files
   * @default "src"
   */
  directory?: string
  /**
   * Path alias to use to map the Domain name
   * @example { 'Marketing': '/', 'Sales': '/s'}
   */
  domainPathAlias?: Record<string, string>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@huang-julien/nuxt-domain-driven',
    configKey: 'ddd',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  async setup(options, nuxt) {
    const { directory = 'src' } = options
    const { rootDir } = nuxt.options

    const directoryDir = join(rootDir, directory)
    const contents = await readdirSync(directoryDir)
    const registeredPages: NuxtPage[] = []

    for (const content of contents) {
      if (directoryExist(join(directoryDir, content))) {
        if (directoryExist(join(directoryDir, content, 'components'))) {
          addComponentsDir({
            path: join(directoryDir, content, 'components'),
            prefix: content,
            watch: true,
          })
        }

        const composableDir = join(directoryDir, content, 'composables')
        if (directoryExist(composableDir)) {
          addImportsDir(composableDir)
        }

        const utilsDir = join(directoryDir, content, 'utils')
        if (directoryExist(utilsDir)) {
          addImportsDir(utilsDir)
        }

        const pagesDir = join(directoryDir, content, 'pages')

        if (directoryExist(pagesDir)) {
          registeredPages.push(...registerPages(pagesDir, directoryDir, options.domainPathAlias?.[content] ?? content))
        }
      }
    }

    nuxt.hook('pages:extend', (pages) => {
      pages.push(...registeredPages)
    })
  },
})

function directoryExist(directory: string): boolean {
  return existsSync(directory) && lstatSync(directory).isDirectory()
}

function registerPages(pagesDir: string, srcDir: string, prefix: string, pages: NuxtPage[] = []) {
  const contents = readdirSync(pagesDir)

  for (const content of contents) {
    if (directoryExist(join(pagesDir, content))) {
      registerPages(join(pagesDir, content), srcDir, prefix, pages)
    }
    else {
      const pathToParse = prefix ? join(prefix, pagesDir.split(join(srcDir, content))[1]) : pagesDir.split(srcDir)[1]
      const { path } = toVueRouter4(pathToParse)

      pages.push({
        path,
        file: join(pagesDir, content),
      })
    }
  }

  return pages
}
