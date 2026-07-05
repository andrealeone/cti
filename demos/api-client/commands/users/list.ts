import { command } from 'concise-ti'
import { DATA, baseUrl, emit } from '../../lib/utils'

export default command({
  meta: { description: 'List users' },
  run(ctx) {
    ctx.io.write(`Fetching ${baseUrl(ctx)}/users`)
    emit(ctx, DATA.users)
  },
})
