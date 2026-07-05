# API Client Demo

A mock REST client CLI showcasing nested command directories, an extended `Config` type, and route collapsing.

## Commands

### `config`

Show the resolved API configuration (base URL, masked key, version).

```bash
bun run ./main.ts config
```

### `posts`

Summarize available posts.

```bash
bun run ./main.ts posts
```

### `posts list [--limit <n>]`

List posts, up to `--limit` (default: all).

```bash
bun run ./main.ts posts list --limit 2
```

### `posts get [id]`

Get a single post by id (defaults to `1`).

```bash
bun run ./main.ts posts get 2
```

### `users list`

List users.

```bash
bun run ./main.ts users list
```

### `users get [id]`

Get a single user by id (defaults to `1`).

```bash
bun run ./main.ts users get 2
```

## Key Patterns

1. **Extended `Config`**: `ApiClientConfig` adds an `apiVersion` field alongside the fields concise-ti reads itself
2. **Nested command directories**: `commands/posts/` and `commands/users/` become the `posts` and `users` subtrees
3. **`index.ts` collapse**: `commands/posts/index.ts` is the `posts` command itself, not `posts index`
4. **Typed flags**: `command<PostsListFlags>()` carries a flag shape into `ctx.flags` for the handler
