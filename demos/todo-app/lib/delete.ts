import { command } from 'concise-ti'
import { mutateById } from '../state'

export default command({
  meta: { description: 'Delete a TODO item', aliases: ['rm'] },
  args: [{ name: 'id', description: 'TODO id', required: true }],
  run(ctx) {
    return mutateById(ctx, (todos, id) => {
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) {
        ctx.io.writeError(`TODO with id ${id} not found`)
        return 1
      }
      const [deleted] = todos.splice(index, 1)
      return `✓ Deleted: "${deleted.text}"`
    })
  },
})
