import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { describe, vi, expect, it } from 'vitest'
import { generatePages } from '../../src/generatePages'

const basicFixturesDir = fileURLToPath(new URL('../fixtures/basic', import.meta.url))

vi.mock('@nuxt/kit', async (og) => {
  const mod = await og<typeof import('@nuxt/kit')>()
  return {
    ...mod,
    useNuxt() {
      return {
        options: {
          extensions: ['.vue', '.ts', '.js'],
        },
      }
    },
  }
})

describe('generate pages', () => {
  it('should generate pages', async () => {
    const pages = await generatePages(join(basicFixturesDir, 'domains', 'Hello', 'pages'), 'Hello')
    expect(pages).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "file": "D:/repo/nuxt-domain-driven/test/fixtures/basic/domains/Hello/pages/[test]/[id].vue",
          "name": "Hello-test-id",
          "path": "/Hello/:test()/:id()",
        },
        {
          "children": [],
          "file": "D:/repo/nuxt-domain-driven/test/fixtures/basic/domains/Hello/pages/index.vue",
          "name": "Hello",
          "path": "/Hello",
        },
        {
          "children": [
            {
              "children": [],
              "file": "D:/repo/nuxt-domain-driven/test/fixtures/basic/domains/Hello/pages/parent/child.vue",
              "name": "Hello-parent-child",
              "path": "child",
            },
          ],
          "file": "D:/repo/nuxt-domain-driven/test/fixtures/basic/domains/Hello/pages/parent.vue",
          "name": "Hello-parent",
          "path": "/Hello/parent",
        },
      ]
    `)
  })
})
