import { command } from '@/core/command'
import { compile } from '@/core/compile'

export default command({
  meta: { description: 'Compile a CLI' },
  rawArgs: true,
  run(ctx) {
    return compile(ctx.positionals)
  },
})
