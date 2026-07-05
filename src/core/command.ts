import type { Config } from '@/types/config'
import type { CommandModule } from '@/types/command'

/**
 * Wrapper for defining a command module.
 * Validates the command definition and ensures type consistency.
 *
 * The `C` generic lets commands in CLIs with an extended `Config` (see
 * `run<ConfigType>()` in `@/core/runtime`) get a typed `ctx.config` without
 * casting: `command<Flags, MyConfig>({ ... })`.
 *
 * @example
 * ```typescript
 * export default command({
 *   meta: { description: 'What this command does' },
 *   run({ io }) {
 *     io.write('Hello!')
 *   },
 * })
 * ```
 */
export function command<F = Record<string, unknown>, C extends Config = Config>(
  module: CommandModule<F, C>,
): CommandModule<F, C> {
  return module
}
