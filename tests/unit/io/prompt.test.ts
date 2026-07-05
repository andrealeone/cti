import { describe, test, expect } from 'bun:test'
import { closePrompts } from '@/io/prompt'

/**
 * `prompt`/`confirm`/`select` now read real lines from `process.stdin` (see
 * src/io/prompt.ts), so they're no longer pure functions a unit test can
 * exercise in-process without a real stdin stream to feed. Their actual
 * behavior — reading a piped answer, falling back on EOF, and the
 * process-exit fix `closePrompts()` provides — is covered end-to-end in
 * tests/e2e/cli.e2e.test.ts's "ctx.io.prompt" block, which spawns a real CLI
 * process with real stdin. `closePrompts` itself has no stdin dependency, so
 * its no-op/idempotent behavior is tested here.
 */
describe('closePrompts', () => {
  test('is a no-op when no prompt has read from stdin yet', () => {
    expect(() => {
      closePrompts()
    }).not.toThrow()
  })

  test('is idempotent', () => {
    closePrompts()
    expect(() => {
      closePrompts()
    }).not.toThrow()
  })
})
