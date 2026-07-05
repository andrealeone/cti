import { command } from 'concise-ti'
import { DATA } from '../../lib/utils'

// commands/posts/index.ts collapses into the parent route: this is `posts`,
// not `posts index`.
export default command({
  meta: { description: 'Summarize available posts' },
  run(ctx) {
    ctx.io.write(`${DATA.posts.length} post(s) available.`)
    ctx.io.write(`Use 'posts list' to list them or 'posts get <id>' to fetch one.`)
  },
})
