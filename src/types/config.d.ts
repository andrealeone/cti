import type { Manifest } from '@/types/manifest'

export interface Config {
  name: string
  version: string
  commandsDir?: string
  targets?: string[]
  bin?: string
  manifest?: Manifest
  /**
   * Routes to exclude from dispatch entirely (slash-delimited, e.g. `'admin/reset'`).
   * Applies to manifest/discovered commands and to the default `help`/`version`
   * commands alike — a skipped route behaves as if it were never registered.
   */
  skip?: string[]
  /**
   * Route dispatched to when the CLI is invoked with no arguments (slash-delimited,
   * e.g. `'admin/status'`). Defaults to `'help'`. Must name an existing, non-skipped
   * route in the resolved manifest — `run()` throws otherwise.
   */
  entry?: string
}
