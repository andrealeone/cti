import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { applyPackageJson, applyTemplate, isEmptyDir } from '../../../../cli/lib/init/template'
import type { PackageJson } from '../../../../cli/lib/init/package-json'

const TREE = {
  truncated: false,
  tree: [
    { path: 'demos/hello-world/main.ts', type: 'blob' },
    { path: 'demos/hello-world/package.json', type: 'blob' },
    { path: 'demos/hello-world/readme.md', type: 'blob' },
    { path: 'demos/hello-world/commands', type: 'tree' },
    { path: 'demos/hello-world/commands/hello.ts', type: 'blob' },
  ],
}

const FILE_CONTENTS: Record<string, string> = {
  'demos/hello-world/main.ts': "import { run } from 'concise-ti'\n",
  'demos/hello-world/package.json': '{"name":"concise-ti-demo-hello-world"}\n',
  'demos/hello-world/readme.md': '# Hello World\n',
  'demos/hello-world/commands/hello.ts': 'export default { run() {} }\n',
}

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  global.fetch = ((url: string) => {
    if (url.includes('api.github.com')) return Promise.resolve(new Response(JSON.stringify(TREE)))

    const path = url.replace('https://raw.githubusercontent.com/andrealeone/cti/main/', '')
    const content = FILE_CONTENTS[path]

    return Promise.resolve(
      content === undefined ? new Response('Not Found', { status: 404 }) : new Response(content),
    )
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'concise-ti-template-test-'))
}

describe('isEmptyDir', () => {
  test('is true for a directory that does not exist yet', () => {
    expect(isEmptyDir(join(tmpDir(), 'does-not-exist'))).toBe(true)
  })

  test('is true for an existing empty directory', () => {
    expect(isEmptyDir(tmpDir())).toBe(true)
  })

  test('is false for a non-empty directory', () => {
    const dir = tmpDir()
    writeFileSync(join(dir, 'file.txt'), 'x')

    expect(isEmptyDir(dir)).toBe(false)
  })
})

describe('applyTemplate', () => {
  test('copies every file when creating a new project', async () => {
    const dir = tmpDir()

    const written = await applyTemplate('hello-world', dir, 'new')

    expect(written.sort()).toEqual(['commands/hello.ts', 'main.ts', 'package.json', 'readme.md'])
    expect(existsSync(join(dir, 'package.json'))).toBe(true)
    expect(existsSync(join(dir, 'readme.md'))).toBe(true)
    expect(existsSync(join(dir, 'commands', 'hello.ts'))).toBe(true)
  })

  test('skips package.json and readme.md when adding to the current project', async () => {
    const dir = tmpDir()

    await applyTemplate('hello-world', dir, 'current')

    expect(existsSync(join(dir, 'package.json'))).toBe(false)
    expect(existsSync(join(dir, 'readme.md'))).toBe(false)
    expect(existsSync(join(dir, 'main.ts'))).toBe(true)
    expect(existsSync(join(dir, 'commands', 'hello.ts'))).toBe(true)
  })
})

describe('applyPackageJson', () => {
  test('creates a package.json when none exists', () => {
    const dir = tmpDir()

    applyPackageJson(dir, 'my-cli')

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
    expect(pkg.name).toBe('my-cli')
    expect(pkg.scripts?.cli).toBe('bun run ./main.ts')
    expect(pkg.dependencies?.['concise-ti']).toMatch(/^\^/)
  })

  test('patches an existing package.json without clobbering other fields', () => {
    const dir = tmpDir()
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'old-name', scripts: { test: 'echo ok' } }),
    )

    applyPackageJson(dir, 'new-name')

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
    expect(pkg.name).toBe('new-name')
    expect(pkg.scripts?.test).toBe('echo ok')
    expect(pkg.scripts?.cli).toBe('bun run ./main.ts')
  })
})
