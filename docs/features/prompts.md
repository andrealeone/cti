# Prompts

`ctx.io` exposes three prompt primitives (`prompt`, `confirm`, `select`) for
asking the user something. **All three are currently stubs**: none of them
read stdin yet. The interface is final; the implementation is a tracked
[Roadmap](../future/roadmap.md) item, so code written against it today keeps
working unchanged once it's real.

## Current behavior

```typescript
await ctx.io.prompt('Your name?') // always resolves to ''
await ctx.io.confirm('Continue?') // always resolves to false (or `fallback`)
await ctx.io.select('Pick one', ['a', 'b']) // always resolves to 'a', the first choice
```

This holds regardless of `isTTY`; the stub doesn't check it.

## The intended shape

```typescript
run(ctx) {
  const name = await ctx.io.prompt('What is your name?')
  const confirmed = await ctx.io.confirm('Are you sure?', false)
  const choice = await ctx.io.select('Choose an environment:', [
    'development', 'staging', 'production',
  ] as const)
}
```

`confirm`'s second argument is the fallback used both when the stub is active
and, once implemented, when input can't be read (non-TTY, closed stdin);
it defaults to `false`.

## Writing code that survives the upgrade

Don't special-case the stub. Write handlers against the real interface:

```typescript
run(ctx) {
  const proceed = await ctx.io.confirm('Deploy to production?', false)
  if (!proceed) return 0
  // ...
}
```

Today this always skips the deploy (confirm resolves to `false`); once prompts
are implemented, the same code starts asking the user for real, with no
rewrite needed.
