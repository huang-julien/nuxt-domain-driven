import { addServerHandler, resolveFiles } from '@nuxt/kit'

import escapeRE from 'escape-string-regexp'
import { extname, join, relative } from 'pathe'
import { existDir, getRoutePath, parseSegment } from './utils'

export const enum HandlerType {
  Route,
  Api,
  Middleware,
}

export async function addServerDirWithDomain(dir: string, domain: string) {
  if (await existDir(join(dir, 'api'))) {
    await addServerHandlers(join(dir, 'api'), domain, HandlerType.Api)
  }

  if (await existDir(join(dir, 'routes'))) {
    await addServerHandlers(join(dir, 'routes'), domain, HandlerType.Route)
  }
}

async function addServerHandlers(dir: string, prefix: string, type: HandlerType) {
  const files = await resolveFiles(dir, `**/*{.ts,.js}`)

  for (const file of files) {
    addServerHandler({
      handler: file,
      route: getRouteFromFile(relative(dir, file), prefix, type),
    })
  }
}

function getRouteFromFile(file: string, domain: string, handlerType: HandlerType) {
  const segments = file.replace(new RegExp(`${escapeRE(extname(file))}$`), '').split('/')

  let routePath = handlerType === HandlerType.Api ? join('/api', domain) : join('domain')
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    const tokens = parseSegment(segment)
    routePath += getRoutePath(tokens)
  }

  return routePath
}
