import { run } from 'concise-ti'
import type { Config } from 'concise-ti'

// Config isn't sealed: a real CLI can carry its own fields (a feature flag, an
// API version, whatever commands need) alongside the fields concise-ti reads itself.
export interface ApiClientConfig extends Config {
  apiVersion: string
}

const config: ApiClientConfig = { name: 'api-client', version: '1.0.0', apiVersion: 'v2' }

// The explicit type argument carries ApiClientConfig into every command's
// ctx.config, so handlers no longer need to cast it (see commands/config.ts).
void run<ApiClientConfig>(config, import.meta)
