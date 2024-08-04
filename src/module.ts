import { readdirSync, lstatSync, existsSync } from 'node:fs'
import { defineNuxtModule, addComponentsDir, addImportsDir, useNuxt } from '@nuxt/kit'
import { join } from 'pathe'
import { toVueRouter4 } from 'unrouting'
import type { NuxtPage } from '@nuxt/schema'

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
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@huang-julien/nuxt-domain-driven',
    configKey: 'domainDrivenConfig',
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
          registeredPages.push(...generatePages(options, pagesDir, content, [], true))
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

function generatePages(moduleOptions: ModuleOptions, currentDir: string, prefix: string, pages: NuxtPage[] = [], isRoot = false) {
  const nuxt = useNuxt()

  const pagesDir = join(nuxt.options.rootDir, moduleOptions.directory ?? 'src')

  const dirContent = readdirSync(currentDir)

  for (const content of dirContent) {
    if (fileExist(join(currentDir, content))) {
      const pathToParse = isRoot ? join(moduleOptions.domains?.domainPathAlias?.[prefix] ?? prefix, content) : content
      const relativePath = join(currentDir, content).replace(pagesDir + '/' + prefix + '/pages', '')
      const { path } = toVueRouter4(pathToParse)

      const name = `${prefix}${relativePath.replace(/\//g, '-').replace(/\.vue$/, '')}`

      pages.push({
        path,
        file: join(currentDir, content),
        children: [],
        name,
      })
    }
  }

  for (const content of dirContent) {
    if (directoryExist(join(currentDir, content))) {
      const parent = fileExist(join(currentDir, `${content}.vue`)) ? findParentPage(pages, join(currentDir, `${content}.vue`))?.children : pages
      generatePages(moduleOptions, join(currentDir, content), prefix, parent)
    }
  }

  return prepareRoutes(pages)
}

function prepareRoutes(routes: NuxtPage[], parent?: NuxtPage, names = new Set<string>()) {
  for (const route of routes) {
    // Remove -index
    if (route.name) {
      route.name = route.name
        .replace(/\/index$/, '')
        .replace(/\//g, '-')

      if (names.has(route.name)) {
        const existingRoute = findRouteByName(route.name, routes)
        const extra = existingRoute?.name ? `is the same as \`${existingRoute.file}\`` : 'is a duplicate'
        console.warn(`Route name generated for \`${route.file}\` ${extra}. You may wish to set a custom name using \`definePageMeta\` within the page file.`)
      }
    }

    // Remove leading / if children route
    if (parent && route.path[0] === '/') {
      route.path = route.path.slice(1)
    }

    if (route.children?.length) {
      route.children = prepareRoutes(route.children, route, names)
    }

    if (route.children?.find(childRoute => childRoute.path === '')) {
      delete route.name
    }

    if (route.name) {
      names.add(route.name)
    }
  }

  return routes
}

function findParentPage(pages: NuxtPage[], path: string): NuxtPage | undefined {
  for (const page of pages) {
    const children = page.children
    if (children && children.length > 0) {
      const page = findParentPage(children, path)
      if (page) {
        return page
      }
    }
    if (page.file === path) {
      return page
    }
  }
}
function findRouteByName(name: string, routes: NuxtPage[]): NuxtPage | undefined {
  for (const route of routes) {
    if (route.name === name) {
      return route
    }
  }
  return findRouteByName(name, routes)
}

function fileExist(file: string): boolean {
  return existsSync(file) && lstatSync(file).isFile()
}
