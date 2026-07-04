import { command } from 'cti'
import { loadTodos, saveTodos } from '../state'

export default command({
  meta: { description: 'Add a new TODO item' },
  run(ctx) {
    if (ctx.positionals.length === 0) {
      ctx.io.writeError('Usage: todo add <text>')
      return 1
    }
    const todos = loadTodos()
    const id = Math.max(0, ...todos.map((t) => t.id)) + 1
    const text = ctx.positionals.join(' ')
    todos.push({ id, text, completed: false })
    saveTodos(todos)
    ctx.io.write(`✓ Added: "${text}"`)
  },
})
