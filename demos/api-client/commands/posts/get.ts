import { command } from 'concise-ti'
import { DATA, emit } from '../../lib/utils'

export default command({
  meta: { description: 'Get a single post by id' },
  args: [{ name: 'id', description: 'Numeric post id', required: false }],
  run(ctx) {
    const id = Number.parseInt(ctx.positionals[0] ?? '1', 10),
      post = DATA.posts.find((p) => p.id === id)

    if (!post) {
      ctx.io.writeError(`Post ${id} not found`)
      return 1
    }

    emit(ctx, post)
  },
})
