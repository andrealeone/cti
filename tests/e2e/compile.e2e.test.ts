import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { compile } from '@/core/compile'

/**
 * END-TO-END: proves the actual bug fix. `discoverManifest`'s `readdirSync`
 * cannot see real files inside a `bun build --compile` binary's virtual
 * filesystem (confirmed: it throws ENOENT there). `compile` works around
 * this by running the entry once to resolve its manifest, then temporarily
 * substituting the framework's own `generated-manifest.ts` before compiling
 * the entry unchanged. This spawns the real compiled binary to prove the fix,
 * not just the generator; the entrypoint below is the exact one-liner a user
 * would write, unmodified.
 */

const RUNTIME_ENTRY = join(import.meta.dir, '..', '..', 'src', 'index.ts')

function scaffold(): { dir: string; entry: string } {
  const dir = mkdtempSync(join(tmpdir(), 'concise-ti-compile-e2e-'))

  mkdirSync(join(dir, 'commands', 'users'), { recursive: true })

  writeFileSync(
    join(dir, 'commands', 'ping.ts'),
    `export default { meta: { description: 'ping' }, run: (ctx: any) => { ctx.io.write('pong') } }`,
  )
  writeFileSync(
    join(dir, 'commands', 'users', 'list.ts'),
    `export default { run: (ctx: any) => { ctx.io.write('Listing ' + ctx.positionals.join(',')) } }`,
  )
  writeFileSync(
    join(dir, 'main.ts'),
    [
      `import { run } from ${JSON.stringify(RUNTIME_ENTRY)}`,
      ``,
      `void run({ name: 'x', bin: 'x', version: '1.0.0', commandsDir: 'commands' }, import.meta)`,
      ``,
    ].join('\n'),
  )

  return { dir, entry: join(dir, 'main.ts') }
}

describe('concise-ti compile', () => {
  test('compiling a commandsDir entry directly (bypassing compile) fails clearly', async () => {
    const { dir, entry } = scaffold()

    // Compile the *user's own entry* directly with `bun build --compile`,
    // exactly as the old `docs/features/manifest.md` claimed was safe to do.
    // `run()` detects it's running inside a compiled binary and refuses to
    // silently return an empty manifest.
    const outfile = join(dir, 'dist-broken')
    const build = Bun.spawn(['bun', 'build', entry, '--compile', '--outfile', outfile], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await build.exited

    const proc = Bun.spawn([outfile, 'ping'], { stdout: 'pipe', stderr: 'pipe' })
    const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited])

    expect(exitCode).toBe(1)
    expect(stderr).toContain('must be compiled with `concise-ti compile`')
  })

  test('compile produces a binary that resolves discovered commands', async () => {
    const { dir, entry } = scaffold()
    const outfile = join(dir, 'dist-fixed')

    const code = await compile([entry, '--outfile', outfile])
    expect(code).toBe(0)
    expect(existsSync(outfile)).toBe(true)

    const ping = Bun.spawn([outfile, 'ping'], { stdout: 'pipe', stderr: 'pipe' })
    const [pingOut, pingExit] = await Promise.all([new Response(ping.stdout).text(), ping.exited])
    expect(pingOut.trim()).toBe('pong')
    expect(pingExit).toBe(0)

    const list = Bun.spawn([outfile, 'users', 'list', 'alice', 'bob'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [listOut, listExit] = await Promise.all([new Response(list.stdout).text(), list.exited])
    expect(listOut.trim()).toBe('Listing alice,bob')
    expect(listExit).toBe(0)
  })

  test('compiled binary works when invoked from a different working directory', async () => {
    const { dir, entry } = scaffold()
    const outfile = join(dir, 'dist-elsewhere')

    expect(await compile([entry, '--outfile', outfile])).toBe(0)

    const proc = Bun.spawn([outfile, 'ping'], { stdout: 'pipe', stderr: 'pipe', cwd: tmpdir() })
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])

    expect(stdout.trim()).toBe('pong')
    expect(exitCode).toBe(0)
  })
})
