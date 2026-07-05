import { run } from 'cti'
import type { Config } from 'cti'

// Config isn't sealed: a real CLI can carry its own fields (a feature flag, an
// API version, whatever commands need) alongside the fields CTI reads itself.
export interface ApiClientConfig extends Config {
  apiVersion: string
}

const config: ApiClientConfig = { name: 'api-client', version: '1.0.0', apiVersion: 'v2' }

void run(config, import.meta)
