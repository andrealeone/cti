import { command } from 'concise-ti'

export default command({
  meta: { description: 'Say goodbye to someone' },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    ctx.io.write(`Goodbye, ${name}!`)
  },
})
