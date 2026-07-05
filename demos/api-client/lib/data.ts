import type { Context } from 'concise-ti'

// A real client would fetch over HTTP; demos use a fixed dataset so output is
// deterministic and the demo runs offline.
export const DATA = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ],
  posts: [
    { id: 1, title: 'Getting Started with concise-ti', author: 'Alice' },
    { id: 2, title: 'Advanced concise-ti Patterns', author: 'Bob' },
  ],
}

export function baseUrl(ctx: Context): string {
  return ctx.env.API_URL ?? 'https://api.example.com'
}

export function emit(ctx: Context, data: unknown): void {
  ctx.io.write(JSON.stringify(data, null, 2))
}
