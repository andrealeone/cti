## Building Commands

Commands are the heart of CTI. This guide covers patterns and best practices for writing commands that are robust, testable, and user-friendly.

### The Anatomy of a Command

```typescript
import type { Context } from '../types/context'
import type { CommandModule } from '../types/command'

const myCommand = {
  meta: {
    description: 'What this command does',
    examples: ['my-cli mycommand', 'my-cli mycommand --flag=value'],
  },
  flags: {
    verbose: { type: 'boolean', short: 'v', description: 'Verbose output' },
    output: { type: 'string', short: 'o', description: 'Output file' },
  },
  run: async (ctx: Context) => {
    // Implementation
  },
} satisfies CommandModule

export default myCommand
```

Each part serves a purpose:

- **meta**: User-facing documentation
- **flags**: Declare what flags your command accepts
- **run**: The actual implementation

### Writing Effective Metadata

Metadata helps users understand what your command does:

```typescript
const deployCommand = {
  meta: {
    description: 'Deploy application to a cloud environment',
    examples: [
      'my-cli deploy', // Uses defaults
      'my-cli deploy --environment=prod --force', // Production deployment
      'my-cli deploy --help', // Show detailed help
    ],
    aliases: ['push', 'release'], // Alternative names
  },
  // ...
}
```

**Best practices:**

- **Description**: One sentence, present tense, lowercase
- **Examples**: Show realistic usage, cover common patterns
- **Aliases**: Offer shortcuts, but don't overload

### Declaring Flags

Flags are how users customize command behavior:

```typescript
const command = {
  flags: {
    // String flag with default
    environment: {
      type: 'string',
      default: 'staging',
      description: 'Target environment (prod, staging, dev)',
    },

    // Boolean flag with short form
    force: {
      type: 'boolean',
      short: 'f',
      description: 'Skip confirmation prompts',
    },

    // Required flag
    name: {
      type: 'string',
      required: true,
      description: 'Resource name',
    },

    // Number flag
    timeout: {
      type: 'number',
      default: 30000,
      description: 'Timeout in milliseconds',
    },

    // Enum-like (validated via choices)
    severity: {
      type: 'string',
      choices: ['low', 'medium', 'high'],
      description: 'Alert severity level',
    },

    // Multiple values
    tags: {
      type: 'string',
      multiple: true,
      description: 'Tags to apply',
    },
  },
  // ...
}
```

**Guidelines:**

- **Defaults**: Provide sensible defaults so users rarely need flags
- **Short forms**: Offer `-f` for frequently-used flags like `--force`
- **Types**: Use appropriate types (number for counts, boolean for toggles)
- **Descriptions**: Explain what the flag does and what values are valid
- **Multiple**: Only use for flags that can appear multiple times

### Accessing Flags in Handlers

Flags are type-safe when you use generics:

```typescript
interface DeployFlags {
  environment: string
  force: boolean
  timeout: number
}

const command = {
  flags: {
    environment: { type: 'string', default: 'staging' },
    force: { type: 'boolean' },
    timeout: { type: 'number', default: 30000 },
  },
  run: async (ctx: Context<DeployFlags>) => {
    const env = ctx.flags.environment // TypeScript knows this is string
    if (ctx.flags.force) {
      /* ... */
    } // Known to be boolean

    const wait = ctx.flags.timeout * 1000 // Safe: known to be number
  },
} satisfies CommandModule<DeployFlags>
```

Without generics:

```typescript
run: async (ctx: Context) => {
  const env = ctx.flags.environment // any [Problem]
  ctx.flags.timeout * 1000 // Could fail at runtime [Problem]
}
```

Always use generics for type safety.

### Working with Positional Arguments

Positionals are remaining arguments after flags:

```bash
my-cli deploy src/ dist/ --force
```

Parses to:

```typescript
ctx.flags = { force: true }
ctx.positionals = ['src/', 'dist/']
```

In your handler:

```typescript
const command = {
  run: async (ctx: Context) => {
    // Typed access
    const source = ctx.positionals[0]
    const dest = ctx.positionals[1]

    // Validation
    if (!source || !dest) {
      ctx.io.writeError('Usage: deploy <source> <destination>')
      process.exit(1)
    }

    // Use them
    await deploy(source, dest, ctx.flags.force)
  },
}
```

**Best practice:** Validate positionals early. Print usage if missing.

### User Interaction

Use the I/O interface for interaction:

#### Writing Output

```typescript
ctx.io.write('Deployment complete')
ctx.io.writeError('Something went wrong')
```

#### Colored Output

```typescript
const success = ctx.io.color('[OK] Done', 'green')
const error = ctx.io.color('[Error] Failed', 'red')
const warning = ctx.io.color('[Warning] Warning', 'yellow')

ctx.io.write(`${success} Deployment finished`)
ctx.io.write(`${warning} Some warnings detected`)
```

Available colors: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `gray`

#### Spinners

```typescript
const spinner = ctx.io.spinner('Deploying...')
try {
  await deploy()
  spinner.succeed('Deployment complete')
} catch (err) {
  spinner.fail('Deployment failed')
  throw err
}
```

#### User Input

```typescript
const name = await ctx.io.prompt('Project name: ')

const confirmed = await ctx.io.confirm('Continue?', false)
if (!confirmed) return

const option = await ctx.io.select('Choose an environment:', [
  'development',
  'staging',
  'production',
])
```

### Error Handling

Handle errors gracefully:

```typescript
const command = {
  run: async (ctx: Context) => {
    try {
      await someOperation()
    } catch (err) {
      if (err instanceof NetworkError) {
        ctx.io.writeError(ctx.io.color('Network error: ' + err.message, 'red'))
        process.exit(1)
      }

      // Unknown error
      ctx.logger.error('Unexpected error:', err)
      ctx.io.writeError(ctx.io.color('Something went wrong. Run with DEBUG=1 for details.', 'red'))
      process.exit(1)
    }
  },
}
```

**Guidelines:**

- **Handle known errors**: Provide user-friendly messages
- **Exit with status codes**: Non-zero for errors, zero for success
- **Use logger for debug**: Set `DEBUG=1` to see detailed info
- **Use colors wisely**: Red for errors, green for success, yellow for warnings

### Logging

Use the logger for internal diagnostics:

```typescript
ctx.logger.debug('Starting operation', { args })
ctx.logger.info('Operation successful')
ctx.logger.warn('Deprecated API used')
ctx.logger.error('Operation failed', err)
```

Logger respects the `DEBUG` environment variable:

```bash
DEBUG=1 my-cli deploy  # Shows debug logs
my-cli deploy          # Hides debug logs
```

### Configuration Access

Access application config through context:

```typescript
const command = {
  run: async (ctx: Context) => {
    const apiUrl = ctx.config.apiUrl
    const apiKey = process.env.API_KEY // Secrets from env

    const result = await fetch(`${apiUrl}/deploy`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  },
}
```

### Async Operations

Commands run asynchronously. Use async/await:

```typescript
const command = {
  run: async (ctx: Context) => {
    const result = await fetch('https://api.example.com/status')
    const data = await result.json()
    ctx.io.write(`Status: ${data.status}`)
  },
}
```

Return early on errors:

```typescript
const command = {
  run: async (ctx: Context) => {
    if (!ctx.flags.force) {
      const confirmed = await ctx.io.confirm('Continue?')
      if (!confirmed) return // Early return
    }

    await deploy()
  },
}
```

### Exit Codes

Return an exit code from `run()`:

```typescript
const command = {
  run: async (ctx: Context) => {
    if (someError) {
      ctx.io.writeError('Error!')
      return 1 // Exit with code 1
    }
    return 0 // Exit with code 0 (default)
  },
}
```

### Pattern: Multi-Step Operations

For complex workflows, structure as steps:

```typescript
const command = {
  run: async (ctx: Context) => {
    // Validate
    if (!ctx.positionals[0]) {
      ctx.io.writeError('Missing required argument')
      return 1
    }

    // Confirm if dangerous
    if (!ctx.flags.force) {
      const ok = await ctx.io.confirm('This will delete data. Continue?')
      if (!ok) return 0
    }

    // Execute
    try {
      const spinner = ctx.io.spinner('Processing...')
      await process()
      spinner.succeed('Done!')
      return 0
    } catch (err) {
      ctx.logger.error('Failed:', err)
      return 1
    }
  },
}
```

Steps:

1. **Validate**: Check required arguments and flags
2. **Confirm**: Ask for confirmation if needed
3. **Execute**: Do the actual work
4. **Handle errors**: Catch and report failures

### Pattern: Batching Operations

For commands that operate on multiple items:

```typescript
const command = {
  run: async (ctx: Context) => {
    const items = ctx.positionals // Multiple targets
    const verbose = ctx.flags.verbose

    for (const item of items) {
      try {
        await process(item)
        if (verbose) {
          ctx.io.write(ctx.io.color(`[OK] ${item}`, 'green'))
        }
      } catch (err) {
        ctx.io.write(ctx.io.color(`[Error] ${item}: ${err.message}`, 'red'))
      }
    }
  },
}
```

### Testing Commands

Commands are easy to test because they're just functions:

```typescript
import { describe, test, expect } from 'bun:test'
import command from './mycommand'

describe('mycommand', () => {
  test('runs successfully', async () => {
    const ctx: Context = {
      flags: {},
      positionals: [],
      route: ['mycommand'],
      cwd: '/tmp',
      env: {},
      config: {
        /* mock */
      },
      io: {
        /* mock */
      },
      logger: {
        /* mock */
      },
    }

    const result = await command.run(ctx)
    expect(result).toBe(0)
  })
})
```

---

### Next Steps

- **[Examples](examples.md)**: Real-world command patterns
- **[Architecture: Core Module](../architecture/core.md)**: How commands are dispatched
