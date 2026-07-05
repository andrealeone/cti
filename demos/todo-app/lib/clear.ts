import { command } from 'cti'
import { loadTodos, saveTodos } from '../state'

export default command({
  // hidden: true keeps a maintenance command out of future generated help
  // output without removing it from routing.
  meta: { description: 'Delete all completed TODOs', hidden: true },
  run(ctx) {
    const todos = loadTodos()
    const remaining = todos.filter((t) => !t.completed)
    saveTodos(remaining)
    ctx.io.write(`✓ Cleared ${todos.length - remaining.length} completed TODO(s)`)
  },
})
