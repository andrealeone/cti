import { command } from 'concise-ti'

export default command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    ctx.io.write(`Hello, ${name}!`)
  },
})
