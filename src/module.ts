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
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-domain-driven',
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
          registeredPages.push(...registerPages(pagesDir, directoryDir, content))
        }
      }
    }

    nuxt.hook('pages:extend', (pages) => {
      console.log(registeredPages, '!!!!!!!!!!!!!!')
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
      const { path } = toVueRouter4(join(pagesDir.split(srcDir)[1]))

      pages.push({
        path,
        file: join(pagesDir, content),
      })
    }
  }

  return pages
}
