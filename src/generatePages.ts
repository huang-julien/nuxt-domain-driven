import { useNuxt, resolveFiles } from '@nuxt/kit'
import { extname, relative } from 'pathe'

import type { NuxtPage } from '@nuxt/schema'
import { joinURL, withLeadingSlash } from 'ufo'
import escapeRE from 'escape-string-regexp'
import { parseSegment, getRoutePath } from './utils'

interface ScannedFile {
  relativePath: string
  absolutePath: string
  domain: string
}

export async function generatePages(dir: string, domain: string) {
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
