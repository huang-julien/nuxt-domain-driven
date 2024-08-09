import { readdirSync, lstatSync, existsSync } from 'node:fs'
import { defineNuxtModule, addComponentsDir, addImportsDir, useNuxt, resolveFiles } from '@nuxt/kit'
import { join, extname, relative } from 'pathe'

import type { NuxtPage } from '@nuxt/schema'
import { encodePath, joinURL, withLeadingSlash } from 'ufo'
import escapeRE from 'escape-string-regexp'

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

const PARAM_CHAR_RE = /[\w.]/

interface ScannedFile {
  relativePath: string
  absolutePath: string
  domain: string
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
          registeredPages.push(...(await generatePages(pagesDir, content)))
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

async function generatePages(dir: string, domain: string) {
  const nuxt = useNuxt()

  const files = await resolveFiles(dir, `**/*{${nuxt.options.extensions.join(',')}}`)

  const pages: NuxtPage[] = []
  const scannedFiles: ScannedFile[] = []
  scannedFiles.push(...files.map(file => ({ relativePath: relative(dir, file), absolutePath: file, domain })))

  // sort scanned files using en-US locale to make the result consistent across different system locales
  scannedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en-US'))

  for (const file of scannedFiles) {
    const segments = file.relativePath.replace(new RegExp(`${escapeRE(extname(file.relativePath))}$`), '').split('/')

    const route: NuxtPage = {
      name: domain,
      path: '/' + domain,
      file: file.absolutePath,
      children: [],
    }

    // Array where routes should be added, useful when adding child routes
    let parent = pages

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      const tokens = parseSegment(segment)
      const segmentName = tokens.map(({ value }) => value).join('')

      // ex: parent/[slug].vue -> parent-slug
      route.name += (route.name && '/') + segmentName

      // ex: parent.vue + parent/child.vue
      const path = withLeadingSlash(joinURL(route.path, getRoutePath(tokens).replace(/\/index$/, '/')))
      const child = parent.find(parentRoute => parentRoute.name === route.name && parentRoute.path === path)

      if (child && child.children) {
        parent = child.children
        route.path = ''
      }
      else if (segmentName === 'index' && !route.path) {
        route.path += '/'
      }
      else if (segmentName !== 'index') {
        route.path += getRoutePath(tokens)
      }
    }

    parent.push(route)
  }

  return prepareRoutes(pages)
}

function prepareRoutes(routes: NuxtPage[], parent?: NuxtPage, names = new Set<string>()) {
  for (const route of routes) {
    // Remove -index
    if (route.name) {
      route.name = route.name.replace(/\/index$/, '').replace(/\//g, '-')
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

enum SegmentParserState {
  initial,
  static,
  dynamic,
  optional,
  catchall,
}

enum SegmentTokenType {
  static,
  dynamic,
  optional,
  catchall,
}

function parseSegment(segment: string) {
  let state: SegmentParserState = SegmentParserState.initial
  let i = 0

  let buffer = ''
  const tokens: SegmentToken[] = []

  function consumeBuffer() {
    if (!buffer) {
      return
    }
    if (state === SegmentParserState.initial) {
      throw new Error('wrong state')
    }

    tokens.push({
      type:
 state === SegmentParserState.static
   ? SegmentTokenType.static
   : state === SegmentParserState.dynamic
     ? SegmentTokenType.dynamic
     : state === SegmentParserState.optional
       ? SegmentTokenType.optional
       : SegmentTokenType.catchall,
      value: buffer,
    })

    buffer = ''
  }

  while (i < segment.length) {
    const c = segment[i]

    switch (state) {
      case SegmentParserState.initial:
        buffer = ''
        if (c === '[') {
          state = SegmentParserState.dynamic
        }
        else {
          i--
          state = SegmentParserState.static
        }
        break

      case SegmentParserState.static:
        if (c === '[') {
          consumeBuffer()
          state = SegmentParserState.dynamic
        }
        else {
          buffer += c
        }
        break

      case SegmentParserState.catchall:
      case SegmentParserState.dynamic:
      case SegmentParserState.optional:
        if (buffer === '...') {
          buffer = ''
          state = SegmentParserState.catchall
        }
        if (c === '[' && state === SegmentParserState.dynamic) {
          state = SegmentParserState.optional
        }
        if (c === ']' && (state !== SegmentParserState.optional || segment[i - 1] === ']')) {
          if (!buffer) {
            throw new Error('Empty param')
          }
          else {
            consumeBuffer()
          }
          state = SegmentParserState.initial
        }
        else if (PARAM_CHAR_RE.test(c)) {
          buffer += c
        }
        else {
          // console.debug(`[pages]Ignored character "${c}" while building param "${buffer}" from "segment"`)
        }
        break
    }
    i++
  }

  if (state === SegmentParserState.dynamic) {
    throw new Error(`Unfinished param "${buffer}"`)
  }

  consumeBuffer()

  return tokens
}
interface SegmentToken {
  type: SegmentTokenType
  value: string
}

function getRoutePath(tokens: SegmentToken[]): string {
  return tokens.reduce((path, token) => {
    return (
      path
      + (token.type === SegmentTokenType.optional
        ? `:${token.value}?`
        : token.type === SegmentTokenType.dynamic
          ? `:${token.value}()`
          : token.type === SegmentTokenType.catchall
            ? `:${token.value}(.*)*`
            : encodePath(token.value).replace(/:/g, '\\:'))
    )
  }, '/')
}
