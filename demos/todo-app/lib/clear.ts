import { command } from 'cti'
import { loadTodos, saveTodos } from '../state'

export default command({
  meta: { description: 'Delete all completed TODOs' },
  run(ctx) {
    const todos = loadTodos()
    const remaining = todos.filter((t) => !t.completed)
    saveTodos(remaining)
    ctx.io.write(`✓ Cleared ${todos.length - remaining.length} completed TODO(s)`)
  },
})
