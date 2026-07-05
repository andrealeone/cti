import type { Config } from '@/types/config'
import type { Io, Logger } from '@/types/io'

export interface Context<F = Record<string, unknown>, C extends Config = Config> {
  flags: F
  positionals: string[]
  route: string[]
  cwd: string
  env: Record<string, string | undefined>
  config: C
  io: Io
  logger: Logger
}
