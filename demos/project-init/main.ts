import { command, defineManifest, run } from 'cti'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const init = command({
  meta: { description: 'Scaffold a new project' },
  flags: {
    type: { type: 'string', default: 'cli', description: 'Project type (cli|web|library)' },
    typescript: { type: 'boolean', default: true, description: 'Include a tsconfig.json' },
  },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'my-project'
    const type = ctx.flags.type as string
    const useTs = ctx.flags.typescript !== false

    ctx.io.write(`\n🚀 Creating project "${name}" (${type})\n`)

    const dir = join(ctx.cwd, name)
    mkdirSync(join(dir, 'src'), { recursive: true })

    const pkg = {
      name,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: type === 'cli' ? 'bun run ./main.ts' : 'bun run ./src/index.ts',
      },
    }
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
    ctx.io.write('  ✓ package.json')

    if (useTs) {
      const tsconfig = {
        compilerOptions: { target: 'ES2020', module: 'ES2020', strict: true },
      }
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
      ctx.io.write('  ✓ tsconfig.json')
    }

    writeFileSync(join(dir, 'README.md'), `# ${name}\n\nGenerated with CTI.\n`)
    ctx.io.write('  ✓ README.md')

    ctx.io.write(ctx.io.color(`\n✨ Project "${name}" created successfully!`, 'green'))
    ctx.io.write(`\nNext steps:\n  cd ${name}\n  bun install`)
  },
})

void run({ name: 'project-init', bin: 'init', version: '1.0.0', manifest: defineManifest({ init }) })
