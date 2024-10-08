import { readdirSync, lstatSync, existsSync } from 'node:fs'
import { defineNuxtModule, addComponentsDir, addImportsDir } from '@nuxt/kit'
import { join } from 'pathe'
import type { NuxtPage } from '@nuxt/schema'
import { generatePages } from './generatePages'
import { addServerDirWithDomain } from './server-dir'

export interface ModuleOptions {
  /**
   * The directory to scan for domain-driven design files
   * @default "src"
   */
  directory?: string
  domains?: {
    /**
     * Path alias to use to map the Domain name
     * @example { 'Marketing': '/', 'Sales': '/s'}
     */
    domainPathAlias?: Record<string, string>
  }
  onPageGenerated?: (page: NuxtPage) => void | Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-domain-driven',
    configKey: 'domainDrivenConfig',
    compatibility: {
      bridge: false,
      nuxt: '>=3',
    },
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
          registeredPages.push(...(await generatePages(pagesDir, content, options)))
        }

        const serverDir = join(directoryDir, content, 'server')
        if (directoryExist(serverDir)) {
          await addServerDirWithDomain(serverDir, content)
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
