import { command } from 'concise-ti'
import { DATA, baseUrl, emit } from '../../lib/utils'

interface PostsListFlags {
  limit: number
}

// The explicit type argument carries ctx.flags' shape into the handler, so
// `ctx.flags.limit` below is a `number`, not `unknown`.
export default command<PostsListFlags>({
  meta: { description: 'List posts' },
  flags: {
    limit: { type: 'number', default: DATA.posts.length, description: 'Max posts to return' },
  },
  run(ctx) {
    ctx.io.write(`Fetching ${baseUrl(ctx)}/posts`)
    emit(ctx, DATA.posts.slice(0, ctx.flags.limit))
  },
})
