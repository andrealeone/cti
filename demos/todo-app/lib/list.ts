import { command } from 'concise-ti'
import { loadTodos } from '../state'

export default command({
  meta: { description: 'List all TODO items' },
  run(ctx) {
    const todos = loadTodos()
    if (todos.length === 0) {
      ctx.io.write('No TODOs yet. Add one with: todo add <text>')
      return
    }
    ctx.io.write('\nTODOs:\n')
    for (const todo of todos) {
      const status = todo.completed ? '✓' : '○'
      ctx.io.write(`  ${status} ${todo.id}. ${todo.text}`)
    }
  },
})
