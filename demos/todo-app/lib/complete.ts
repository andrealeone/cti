import { command } from 'cti'
import { mutateById } from '../state'

export default command({
  meta: { description: 'Mark a TODO as complete' },
  run(ctx) {
    return mutateById(ctx, (todos, id) => {
      const todo = todos.find((t) => t.id === id)
      if (!todo) {
        ctx.io.writeError(`TODO with id ${id} not found`)
        return 1
      }
      todo.completed = true
      return `✓ Completed: "${todo.text}"`
    })
  },
})
