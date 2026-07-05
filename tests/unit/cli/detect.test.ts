import { describe, test, expect } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { detectCli, findEntrypoint } from '../../../cli/lib/detect'

function tmpProject(): string {
  return mkdtempSync(join(tmpdir(), 'concise-ti-detect-'))
}

describe('findEntrypoint', () => {
  test('finds main.ts directly in the project root', () => {
    const dir = tmpProject()
    writeFileSync(join(dir, 'main.ts'), '')

    expect(findEntrypoint(dir)).toBe(join(dir, 'main.ts'))
  })

  test('resolves an entry referenced from package.json when main.ts is absent', () => {
    const dir = tmpProject()
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'entry.ts'), '')
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ scripts: { dev: 'bun run ./src/entry.ts' } }),
    )

    expect(findEntrypoint(dir)).toBe(join(dir, 'src', 'entry.ts'))
  })

  test('returns undefined when nothing can be found', () => {
    expect(findEntrypoint(tmpProject())).toBeUndefined()
  })
})

describe('detectCli', () => {
  test('classifies a manifest-based CLI', () => {
    const dir = tmpProject()
    writeFileSync(
      join(dir, 'main.ts'),
      `import { run, defineManifest } from 'concise-ti'\nvoid run({ name: 'x', version: '1.0.0', manifest: defineManifest({}) })\n`,
    )

    const detected = detectCli(dir)

    expect(detected?.kind).toBe('manifest')
  })

  test('classifies a discovery-based CLI and resolves its commands dir', () => {
    const dir = tmpProject()
    mkdirSync(join(dir, 'commands'), { recursive: true })
    writeFileSync(
      join(dir, 'main.ts'),
      `import { run } from 'concise-ti'\nvoid run({ name: 'x', version: '1.0.0' }, import.meta)\n`,
    )

    const detected = detectCli(dir)

    expect(detected?.kind).toBe('discovery')
    expect(detected?.commandsDir).toBe(join(dir, 'commands'))
  })

  test('honors a custom commandsDir literal', () => {
    const dir = tmpProject()
    mkdirSync(join(dir, 'src', 'cmds'), { recursive: true })
    writeFileSync(
      join(dir, 'main.ts'),
      `import { run } from 'concise-ti'\nvoid run({ name: 'x', version: '1.0.0', commandsDir: 'src/cmds' }, import.meta)\n`,
    )

    const detected = detectCli(dir)

    expect(detected?.kind).toBe('discovery')
    expect(detected?.commandsDir).toBe(join(dir, 'src', 'cmds'))
  })

  test('returns undefined when there is no entrypoint', () => {
    expect(detectCli(tmpProject())).toBeUndefined()
  })
})
