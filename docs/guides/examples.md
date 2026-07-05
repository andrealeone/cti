## Examples

Real-world patterns for building concise-ti CLIs. Each example below is a `CommandModule`; wire one or more into a CLI with `defineManifest` + `run` (see the [Quick Start](../getting-started/quickstart.md) and [Demos](demos.md)).

### Hello World

```typescript
// src/commands/hello.ts
import type { CommandModule } from '../types/command'

export default {
  meta: { description: 'Greet someone' },
  flags: {
    name: { type: 'string', description: 'Person to greet' },
    loud: { type: 'boolean', short: 'l', description: 'Shout the greeting' },
  },
  run: async (ctx) => {
    const name = ctx.flags.name || 'World'
    let greeting = `Hello, ${name}!`

    if (ctx.flags.loud) {
      greeting = greeting.toUpperCase()
    }

    ctx.io.write(greeting)
  },
} satisfies CommandModule
```

Usage:

```bash
my-cli hello
# Hello, World!

my-cli hello --name=Alice
# Hello, Alice!

my-cli hello --name=Alice --loud
# HELLO, ALICE!
```

### Deployment Command

```typescript
// src/commands/deploy.ts
import type { Context } from '../types/context'
import type { CommandModule } from '../types/command'

interface DeployFlags {
  environment: string
  force: boolean
  verbose: boolean
}

async function deploy(env: string, verbose: boolean, ctx: Context) {
  const spinner = ctx.io.spinner(`Deploying to ${env}...`)

  try {
    if (verbose) ctx.logger.debug(`Starting deployment to ${env}`)

    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 2000))

    spinner.succeed(`Deployed to ${env}`)
    ctx.io.write(ctx.io.color('[Success] Deployment successful', 'green'))
  } catch (err) {
    spinner.fail(`Deployment failed`)
    ctx.logger.error('Deployment error:', err)
    throw err
  }
}

export default {
  meta: {
    description: 'Deploy application to cloud',
    examples: ['my-cli deploy', 'my-cli deploy --environment=prod --force'],
  },
  flags: {
    environment: {
      type: 'string',
      default: 'staging',
      description: 'Target environment',
    },
    force: {
      type: 'boolean',
      short: 'f',
      description: 'Skip confirmation',
    },
    verbose: {
      type: 'boolean',
      short: 'v',
      description: 'Verbose output',
    },
  },
  run: async (ctx: Context<DeployFlags>) => {
    // Confirm unless force flag is set
    if (!ctx.flags.force) {
      const ok = await ctx.io.confirm(`Deploy to ${ctx.flags.environment}? This cannot be undone.`)
      if (!ok) {
        ctx.io.write('Cancelled')
        return
      }
    }

    try {
      await deploy(ctx.flags.environment, ctx.flags.verbose, ctx)
    } catch (err) {
      process.exit(1)
    }
  },
} satisfies CommandModule<DeployFlags>
```

Usage:

```bash
my-cli deploy
# Deploy to staging? This cannot be undone. (y/n)

my-cli deploy --environment=prod --force
# Deploying to prod...
# [Success] Deployed to prod
# [Success] Deployment successful
```

### File Processing

```typescript
// src/commands/process.ts
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export default {
  meta: {
    description: 'Process files in a directory',
    examples: ['my-cli process ./input', 'my-cli process ./input --output=./output'],
  },
  flags: {
    output: { type: 'string', description: 'Output directory' },
  },
  run: async (ctx) => {
    const inputDir = ctx.positionals[0]
    const outputDir = ctx.flags.output || './output'

    if (!inputDir) {
      ctx.io.writeError('Usage: process <input-directory>')
      process.exit(1)
    }

    try {
      const files = await readdir(inputDir)

      for (const file of files) {
        const spinner = ctx.io.spinner(`Processing ${file}...`)

        try {
          const content = await readFile(join(inputDir, file), 'utf-8')
          const processed = content.toUpperCase()

          // In real usage, write to output
          spinner.succeed(`${file} processed`)
        } catch (err) {
          spinner.fail(`${file} failed`)
        }
      }

      ctx.io.write(ctx.io.color(`\n[Success] Processed ${files.length} files`, 'green'))
    } catch (err) {
      ctx.io.writeError(`Error: ${err.message}`)
      process.exit(1)
    }
  },
} satisfies CommandModule
```

### Interactive Selection

```typescript
// src/commands/init.ts
export default {
  meta: {
    description: 'Initialize a new project',
    examples: ['my-cli init'],
  },
  run: async (ctx) => {
    ctx.io.write('Setting up new project...\n')

    const name = await ctx.io.prompt('Project name: ')

    const type = await ctx.io.select('Project type: ', ['Node.js', 'Python', 'Go', 'Rust'])

    const typescript = await ctx.io.confirm('Use TypeScript?', true)

    const spinner = ctx.io.spinner('Creating project...')
    await new Promise((resolve) => setTimeout(resolve, 1500))

    spinner.succeed('Project created')

    ctx.io.write(`
${ctx.io.color('[Success] Project setup complete', 'green')}

Name:        ${name}
Type:        ${type}
TypeScript:  ${typescript ? 'yes' : 'no'}

Next steps:
  cd ${name}
  npm install
  npm start
    `)
  },
} satisfies CommandModule
```

### API Client

```typescript
// src/commands/request.ts
export default {
  meta: {
    description: 'Make HTTP requests',
    examples: [
      'my-cli request GET /users',
      'my-cli request POST /users --body=\'{"name":"Alice"}\'',
    ],
  },
  flags: {
    body: { type: 'string', description: 'Request body (JSON)' },
    header: { type: 'string', multiple: true, description: 'Headers' },
  },
  run: async (ctx) => {
    const method = ctx.positionals[0]?.toUpperCase()
    const path = ctx.positionals[1]

    if (!method || !path) {
      ctx.io.writeError('Usage: request <METHOD> <PATH>')
      process.exit(1)
    }

    const url = `${ctx.config.apiUrl}${path}`

    try {
      const spinner = ctx.io.spinner(`${method} ${path}...`)

      const headers: any = { 'Content-Type': 'application/json' }

      const response = await fetch(url, {
        method,
        body: ctx.flags.body,
        headers,
      })

      const data = await response.json()

      spinner.succeed(`${response.status}`)
      ctx.io.write(JSON.stringify(data, null, 2))
    } catch (err) {
      ctx.logger.error('Request failed:', err)
      ctx.io.writeError(ctx.io.color('Request failed', 'red'))
      process.exit(1)
    }
  },
} satisfies CommandModule
```

`ctx.config.apiUrl` above assumes `Config` was extended with an `apiUrl`
field. To get that typed without casting, extend `Config`, pass the extended
type to `run<ConfigType>()` in your entrypoint, and declare the same type on
`command<F, ConfigType>()`:

```typescript
// main.ts
interface MyConfig extends Config {
  apiUrl: string
}

const config: MyConfig = { name: 'my-cli', version: '1.0.0', apiUrl: 'https://api.example.com' }
void run<MyConfig>(config, import.meta)
```

```typescript
// src/commands/request.ts
export default command<Record<string, unknown>, MyConfig>({
  run: async (ctx) => {
    ctx.config.apiUrl // string, not a cast
  },
})
```

See the `api-client` demo (in [Demos](demos.md)) for the full working pattern.

---

These examples show:

- **Simple commands**: Greetings, basic I/O
- **Complex operations**: Deployment, file processing
- **User interaction**: Prompts, confirmations, selections
- **Error handling**: Try/catch, graceful failures
- **API integration**: HTTP requests, JSON handling

Adapt these patterns to your needs.
