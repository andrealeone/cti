import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { downloadDemo, listDemoNames } from '../../../../cli/lib/init/github'

/**
 * `cli/lib/github.ts` talks to the real GitHub API by design (see its own
 * docstring), so these tests fake `global.fetch` rather than hitting the
 * network — deterministic, and doesn't burn the unauthenticated rate limit.
 */

const TREE = {
  truncated: false,
  tree: [
    { path: 'demos/hello-world/main.ts', type: 'blob' },
    { path: 'demos/hello-world/package.json', type: 'blob' },
    { path: 'demos/hello-world/commands', type: 'tree' },
    { path: 'demos/hello-world/commands/hello.ts', type: 'blob' },
    { path: 'demos/api-client/main.ts', type: 'blob' },
    { path: 'demos/api-client/commands/users/list.ts', type: 'blob' },
    { path: 'src/index.ts', type: 'blob' },
  ],
}

const FILE_CONTENTS: Record<string, string> = {
  'demos/hello-world/main.ts': "import { run } from 'concise-ti'\n",
  'demos/hello-world/package.json': '{"name":"concise-ti-demo-hello-world"}\n',
  'demos/hello-world/commands/hello.ts': 'export default { run() {} }\n',
}

type FakeFetch = (url: string) => Promise<Response>

function setFetch(impl: FakeFetch): void {
  global.fetch = impl as unknown as typeof fetch
}

async function catchError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
    throw new Error('expected the promise to reject, but it resolved')
  } catch (error) {
    return error as Error
  }
}

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  setFetch((url) => {
    if (url.includes('api.github.com')) return Promise.resolve(new Response(JSON.stringify(TREE)))

    const path = url.replace('https://raw.githubusercontent.com/andrealeone/cti/main/', '')
    const content = FILE_CONTENTS[path]

    if (content === undefined) return Promise.resolve(new Response('Not Found', { status: 404 }))

    return Promise.resolve(new Response(content))
  })
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('listDemoNames', () => {
  test('lists demo directory names found in the tree', async () => {
    expect(await listDemoNames()).toEqual(['api-client', 'hello-world'])
  })
})

describe('downloadDemo', () => {
  test('writes every blob under demos/<name>, preserving relative structure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-github-test-'))

    try {
      const written = await downloadDemo('hello-world', dir)

      expect(written.sort()).toEqual(['commands/hello.ts', 'main.ts', 'package.json'])
      expect(existsSync(join(dir, 'commands', 'hello.ts'))).toBe(true)
      expect(readFileSync(join(dir, 'main.ts'), 'utf8')).toContain('concise-ti')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('throws when the demo has no files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-github-test-'))

    try {
      const error = await catchError(downloadDemo('does-not-exist', dir))
      expect(error.message).toMatch(/No files found/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('throws with a clear message on a failed API request', async () => {
    setFetch(() => Promise.resolve(new Response('rate limited', { status: 403 })))

    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-github-test-'))

    try {
      const error = await catchError(downloadDemo('hello-world', dir))
      expect(error.message).toMatch(/GitHub API request failed/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
