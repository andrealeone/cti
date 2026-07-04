import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import type { Context } from 'cti'

export interface Todo {
  id: number
  text: string
  completed: boolean
}

export const TODOS_FILE = join(homedir(), '.cti-todos.json')

export function loadTodos(): Todo[] {
  if (!existsSync(TODOS_FILE)) return []
  try {
    return JSON.parse(readFileSync(TODOS_FILE, 'utf-8')) as Todo[]
  } catch {
    return []
  }
}

export function saveTodos(todos: Todo[]): void {
  writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf-8')
}

export function mutateById(
  ctx: Context,
  action: (todos: Todo[], id: number) => string | number,
): number {
  if (ctx.positionals.length === 0) {
    ctx.io.writeError(`Usage: todo ${ctx.route[0]} <id>`)
    return 1
  }
  const id = Number.parseInt(ctx.positionals[0], 10)
  const todos = loadTodos()
  const result = action(todos, id)
  if (typeof result === 'number') return result
  saveTodos(todos)
  ctx.io.write(result)
  return 0
}
