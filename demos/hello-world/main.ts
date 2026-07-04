import { command, defineManifest, run } from 'cti'

const hello = command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    ctx.io.write(`Hello, ${name}!`)
  },
})

const goodbye = command({
  meta: { description: 'Say goodbye to someone' },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    ctx.io.write(`Goodbye, ${name}!`)
  },
})

void run({ name: 'hello-world', bin: 'hello', version: '1.0.0', manifest: defineManifest({ hello, goodbye }) })
