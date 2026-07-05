import type { Config } from '@/types/config'
import type { Context } from '@/types/context'

export interface FlagSpec {
  type: 'string' | 'boolean' | 'number'
  short?: string
  description?: string
  default?: string | boolean | number
  required?: boolean
  multiple?: boolean
  choices?: readonly string[]
  validate?: (value: unknown) => true | string
}

export interface ArgSpec {
  name: string
  description?: string
  required?: boolean
  variadic?: boolean
  validate?: (value: string) => true | string
}

export interface CommandMeta {
  description?: string
  aliases?: readonly string[]
  hidden?: boolean
  examples?: readonly string[]
}

export interface CommandModule<F = Record<string, unknown>, C extends Config = Config> {
  meta?: CommandMeta
  flags?: Record<string, FlagSpec>
  args?: ArgSpec[]
  /**
   * Skip strict flag parsing and hand the command's remaining argv straight
   * to `ctx.positionals` unchanged. Needed by commands that forward arbitrary
   * flags to another CLI (e.g. `concise-ti compile` passing `--outfile` etc.
   * through to `bun build`), since `node:util`'s `parseArgs` in strict mode
   * rejects any option not declared in `flags`.
   */
  rawArgs?: boolean
  run: (ctx: Context<F, C>) => void | number | Promise<void | number>
}
