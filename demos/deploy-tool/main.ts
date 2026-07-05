import { command, defineManifest, run } from 'concise-ti'

const ENVIRONMENTS = ['staging', 'production'] as const

const deploy = command({
  meta: { description: 'Deploy application to an environment' },
  flags: {
    env: {
      type: 'string',
      default: 'staging',
      description: 'Target environment',
      choices: ENVIRONMENTS,
    },
    verbose: { type: 'boolean', short: 'v', description: 'Print each step' },
    region: {
      type: 'string',
      short: 'r',
      multiple: true,
      description: 'Region(s) to deploy to (repeatable)',
    },
  },
  run(ctx) {
    const env = ctx.flags.env as string
    const verbose = ctx.flags.verbose === true
    const regions = (ctx.flags.region as string[] | undefined) ?? ['us-east-1']

    // `choices` isn't enforced by the parser yet, so the handler validates.
    if (!ENVIRONMENTS.includes(env as (typeof ENVIRONMENTS)[number])) {
      ctx.io.writeError(`Invalid environment "${env}". Choose one of: ${ENVIRONMENTS.join(', ')}`)
      return 1
    }

    const spinner = ctx.io.spinner(`Deploying to ${env} (${regions.join(', ')})`)
    if (verbose) {
      ctx.io.write('  • Building artifacts')
      ctx.io.write('  • Running tests')
      for (const region of regions) ctx.io.write(`  • Uploading to ${region}`)
    }
    spinner.succeed()
    ctx.io.write(ctx.io.color(`✓ Deployment to ${env} successful!`, 'green'))
  },
})

const rollback = command({
  meta: { description: 'Roll back to the previous version' },
  flags: {
    env: { type: 'string', default: 'staging', description: 'Target environment' },
    force: { type: 'boolean', short: 'f', description: 'Skip the confirmation guard' },
  },
  run(ctx) {
    const env = ctx.flags.env as string
    if (ctx.flags.force !== true) {
      ctx.io.write(ctx.io.color('⚠ Rollback will revert to the previous version', 'yellow'))
      ctx.io.write('  Re-run with --force to confirm')
      return 1
    }
    const spinner = ctx.io.spinner(`Rolling back ${env}`)
    spinner.succeed()
    ctx.io.write(ctx.io.color(`✓ Rollback on ${env} complete!`, 'green'))
  },
})

const status = command({
  meta: { description: 'Check deployment status' },
  flags: {
    env: { type: 'string', default: 'production', description: 'Target environment' },
  },
  run(ctx) {
    const env = ctx.flags.env as string
    ctx.io.write(ctx.io.color(`\nEnvironment: ${env}`, 'blue'))
    ctx.io.write(`Status:  ${ctx.io.color('Healthy', 'green')}`)
    ctx.io.write('Version: 1.2.3')
    ctx.io.write('Uptime:  99.9%')
  },
})

// `rollback` is dangerous enough that it's opt-in: `config.skip` removes it
// from dispatch entirely (not just from `help`'s listing) unless the operator
// explicitly enables it, so `deploy rollback` is `Unknown command` by default.
const rollbackEnabled = process.env.DEPLOY_TOOL_ALLOW_ROLLBACK === '1'

void run({
  name: 'deploy-tool',
  bin: 'deploy',
  version: '1.0.0',
  manifest: defineManifest({ deploy, rollback, status }),
  skip: rollbackEnabled ? [] : ['rollback'],
})
