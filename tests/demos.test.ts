import { describe, test, expect } from 'bun:test'
import { readdirSync, existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * DEMO VALIDATION: one generic harness for every demo under /demos.
 * ==================================================================
 *
 * Strategy (and why):
 *   We validate each demo as a BLACK BOX. We spawn its CLI exactly as a user
 *   would (`bun run <demo>/main.ts <args>`), feed stdin/env, then assert on exit
 *   code + key output fragments. We do NOT assert byte-for-byte transcripts.
 *
 * Why not hard-code full expected output inline?
 *   Full-string equality is brittle: it breaks on ANSI color, spinner frames,
 *   trailing whitespace, and harmless wording tweaks, producing failures that
 *   signal nothing about whether the demo actually works.
 *
 * Why not Bun snapshots (`toMatchSnapshot`)?
 *   Snapshots need no dependency, but they rot: a reviewer runs `--update` and
 *   rubber-stamps a regression, and the expectation is opaque in the diff. They
 *   also choke on non-deterministic output.
 *
 * Chosen middle ground (no third-party deps):
 *   A declarative EXPECTATIONS table of *minimal invariants* (exit code + the
 *   handful of substrings/regexes that prove the command did its job), driven by
 *   a generic runner. The data is per-demo and reviewable; the logic is shared.
 *   Adding a demo = add a folder + an entry here. A demo folder with no entry
 *   FAILS loudly (see "every demo is covered"), so coverage can't silently drift.
 *
 * Isolation:
 *   Stateful demos get a throwaway $HOME so they never touch the real machine.
 */

const DEMOS_DIR = join(import.meta.dir, '..', 'demos')

interface DemoCase {
  name: string
  args: string[]
  stdin?: string
  /** Extra env for this case. `isolateHome: true` redirects $HOME to a temp dir. */
  env?: Record<string, string>
  isolateHome?: boolean
  exit?: number
  stdout?: (string | RegExp)[]
  stderr?: (string | RegExp)[]
}

const EXPECTATIONS: Record<string, DemoCase[]> = {
  'hello-world': [
    { name: 'greets a named person', args: ['hello', 'Alice'], stdout: ['Hello, Alice!'] },
    { name: 'defaults to World', args: ['hello'], stdout: ['Hello, World!'] },
    { name: 'says goodbye', args: ['goodbye', 'Bob'], stdout: ['Goodbye, Bob!'] },
  ],
  'todo-app': [
    {
      name: 'adds an item',
      args: ['add', 'Buy milk'],
      isolateHome: true,
      stdout: [/Added.*Buy milk/],
    },
    {
      name: 'rejects add with no text',
      args: ['add'],
      isolateHome: true,
      exit: 1,
      stderr: [/Usage/],
    },
    { name: 'lists empty by default', args: ['list'], isolateHome: true, stdout: [/No TODOs/] },
  ],
  'deploy-tool': [
    {
      name: 'deploys to an environment',
      args: ['deploy', '--env', 'production'],
      stdout: [/production/, /successful/],
    },
    {
      name: 'blocks rollback without --force',
      args: ['rollback', '--env', 'staging'],
      exit: 1,
      stdout: [/--force/],
    },
    {
      name: 'shows status',
      args: ['status', '--env', 'production'],
      stdout: [/production/, /Healthy/],
    },
  ],
  'api-client': [
    { name: 'lists users', args: ['users', 'list'], stdout: [/Alice/, /Bob/] },
    { name: 'gets a post', args: ['posts', 'get', '1'], stdout: [/Getting Started with CTI/] },
    {
      name: 'shows config from env',
      args: ['config'],
      env: { API_URL: 'https://test.local' },
      stdout: [/test\.local/],
    },
  ],
  'project-init': [
    {
      name: 'scaffolds a project',
      args: ['init', 'tests/demo'],
      isolateHome: true,
      stdout: [/tests\/demo/, /created successfully/],
    },
  ],
  'data-transform': [
    {
      name: 'formats JSON from stdin',
      args: ['format', 'json'],
      stdin: '{"name":"Alice"}',
      stdout: [/"name": "Alice"/],
    },
    {
      name: 'errors on bad input',
      args: ['format', 'json'],
      stdin: 'not json',
      exit: 1,
      stderr: [/Error/],
    },
  ],
  'interactive-io': [
    {
      name: 'views a user profile with colors and logging',
      args: ['view', 'test-user'],
      isolateHome: true,
      exit: 1,
      stderr: [/not found/],
    },
    {
      name: 'creates a profile interactively with fallback',
      args: ['create'],
      isolateHome: true,
      stdin: '',
      exit: 1,
      stderr: [/cannot be empty/],
    },
    {
      name: 'imports profiles from JSON on stdin',
      args: ['import'],
      isolateHome: true,
      stdin:
        '[{"name":"Alice","email":"alice@example.com","role":"admin"},{"name":"Bob","email":"bob@example.com"}]',
      stdout: [/Imported/, /profile/],
    },
    {
      name: 'errors on invalid JSON import',
      args: ['import'],
      isolateHome: true,
      stdin: 'not json',
      exit: 1,
      stderr: [/Error parsing JSON/],
    },
    {
      name: 'lists all profiles with colors',
      args: ['list'],
      isolateHome: true,
      stdout: [/No profiles found/],
    },
  ],
}

/** Discover every demo that ships a runnable CLI. */
function discoverDemos(): string[] {
  if (!existsSync(DEMOS_DIR)) return []
  return readdirSync(DEMOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(DEMOS_DIR, name, 'main.ts')))
    .sort()
}

const demos = discoverDemos()

async function runCase(demo: string, c: DemoCase) {
  const cli = join(DEMOS_DIR, demo, 'main.ts')
  // NO_COLOR keeps output stable and color-free for assertions.
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NO_COLOR: '1',
    ...c.env,
  }
  if (c.isolateHome) env.HOME = mkdtempSync(join(tmpdir(), `cti-demo-${demo}-`))

  const proc = Bun.spawn(['bun', 'run', cli, ...c.args], {
    cwd: c.isolateHome ? env.HOME : join(DEMOS_DIR, demo),
    env,
    stdin: c.stdin ? new TextEncoder().encode(c.stdin) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

describe('demos coverage', () => {
  test('found at least one runnable demo', () => {
    expect(demos.length).toBeGreaterThan(0)
  })

  test('every demo on disk has an expectations entry', () => {
    const missing = demos.filter((d) => !(d in EXPECTATIONS))
    expect(missing).toEqual([])
  })
})

for (const demo of demos) {
  const cases = EXPECTATIONS[demo] ?? []
  describe(`demo: ${demo}`, () => {
    for (const c of cases) {
      test(c.name, async () => {
        const { stdout, stderr, exitCode } = await runCase(demo, c)
        const detail = `\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`

        expect(exitCode, `exit code mismatch${detail}`).toBe(c.exit ?? 0)
        for (const frag of c.stdout ?? []) {
          if (frag instanceof RegExp) expect(stdout, detail).toMatch(frag)
          else expect(stdout, detail).toContain(frag)
        }
        for (const frag of c.stderr ?? []) {
          if (frag instanceof RegExp) expect(stderr, detail).toMatch(frag)
          else expect(stderr, detail).toContain(frag)
        }
      })
    }
  })
}
