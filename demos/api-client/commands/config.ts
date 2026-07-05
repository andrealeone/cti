import { command } from 'cti'
import { baseUrl } from '../lib/utils'
import type { ApiClientConfig } from '../main'

export default command({
  meta: { description: 'Show the resolved API configuration' },
  run(ctx) {
    const key = ctx.env.API_KEY ?? 'demo-key'
    const { apiVersion } = ctx.config as ApiClientConfig
    ctx.io.write('\nAPI Configuration:')
    ctx.io.write(`  Base URL: ${baseUrl(ctx)}`)
    ctx.io.write(`  API Key:  ${key.slice(0, 6)}...`)
    ctx.io.write(`  Version:  ${apiVersion}`)
  },
})
