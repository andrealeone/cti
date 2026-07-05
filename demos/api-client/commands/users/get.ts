import { command } from 'concise-ti'
import { DATA, emit } from '../../lib/utils'

export default command({
  meta: { description: 'Get a single user by id' },
  args: [{ name: 'id', description: 'Numeric user id', required: false }],
  run(ctx) {
    const id = Number.parseInt(ctx.positionals[0] ?? '1', 10)
    const user = DATA.users.find((u) => u.id === id)
    if (!user) {
      ctx.io.writeError(`User ${id} not found`)
      return 1
    }
    emit(ctx, user)
  },
})
