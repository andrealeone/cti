import { describe, test, expect } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * END-TO-END TESTS
 * ===============
 * E2E tests exercise the *real* compiled CLI as a black box: spawn the binary,
 * feed it argv/stdin/env, assert on stdout/stderr/exit code. They prove routing,
 * parsing, dispatch, and IO work together end-to-end.
 */

const ENTRY = join(import.meta.dir, 'cli.ts')
const hasEntry = existsSync(ENTRY)

async function runCli(args: string[], env?: Record<string, string>) {
  const proc = Bun.spawn(['bun', 'run', ENTRY, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  return { stdout, stderr, exitCode }
}

describe('CLI entry point', () => {
  test('an entry point exists to drive e2e tests against', () => {
    expect(hasEntry).toBe(true)
  })
})

describe('command dispatch', () => {
  test('resolves a top-level command and prints its output', async () => {
    const { stdout, exitCode } = await runCli(['ping'])
    expect(stdout.trim()).toBe('pong')
    expect(exitCode).toBe(0)
  })

  test('resolves a nested route over a shorter one', async () => {
    const { stdout, exitCode } = await runCli(['users', 'list'])
    expect(stdout.includes('Listing')).toBe(true)
    expect(exitCode).toBe(0)
  })

  test('passes positionals through to the command', async () => {
    const { stdout, exitCode } = await runCli(['users', 'list', 'filter'])
    expect(stdout.includes('Listing')).toBe(true)
    expect(exitCode).toBe(0)
  })

  test('parses and coerces flags', async () => {
    const { stdout, exitCode } = await runCli(['users', 'list', '--count', '5'])
    expect(stdout.includes('5')).toBe(true)
    expect(exitCode).toBe(0)
  })

  test('exits non-zero on an unknown command', async () => {
    const { stderr, exitCode } = await runCli(['unknown'])
    expect(stderr.includes('Unknown command')).toBe(true)
    expect(exitCode).toBe(1)
  })

  test('defaults to help when no arguments are provided', async () => {
    const { stdout, exitCode } = await runCli([])
    expect(stdout.includes('built with concise-ti')).toBe(true)
    expect(exitCode).toBe(0)
  })
})
