# Scaffolding Commands

`concise-ti scaffold` generates a new command file for a discovery-based CLI
(`commands/*.ts`), from a one-line description of what the command should
look like. It only works for discovery-based CLIs — see
[why](#manifest-based-clis-arent-supported).

```bash
bunx concise-ti scaffold
```

## Locating and classifying your CLI

`scaffold` looks for `main.ts` in the current directory; if that's not there,
it falls back to whatever `.ts` file your `package.json`'s `main`,
`scripts.cli`, or `scripts.dev` points at. If neither turns up a file, it
exits with an error asking you to run `concise-ti init` first.

It then reads that entrypoint's source and checks whether it defines
`manifest: ...` (manifest-based) or not (discovery-based, `commandsDir`
resolved the same way `run()` itself resolves it — see
[Command Routing](../../features/command-routing.md)). This is a regex
heuristic, not real static analysis (see
[The `concise-ti` CLI](../../features/cli.md#command-auto-discovery)) — good
enough for an entrypoint written the conventional way.

### Manifest-based CLIs aren't supported

```
Error: scaffolding isn't supported for manifest-based CLIs. "main.ts" defines
its commands inline via defineManifest — add the new command there directly.
```

A manifest-based CLI's commands are wired into one `defineManifest({...})`
call in `main.ts`; there's no separate file per command for `scaffold` to
generate, and no safe way to inject a new inline entry into an arbitrary
existing manifest literal. Add the command by hand, or switch the project to
command auto-discovery (see [Manifest](../../features/manifest.md)).

## The wizard

**1. What should the command look like?** — a full invocation, exactly as a
user would type it:

```
cli tag add <name> --force
```

**2. Command description?** — free text, becomes `meta.description`.

**3. Overview and confirmation** — `scaffold` prints the route, inferred args
and flags, and the file it's about to write, then asks for confirmation
before touching disk. If the target file already exists, it asks again
before overwriting.

## The command-string grammar

Given `cli tag add <name> --force`:

| Token(s)    | Becomes                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `cli`       | The invoked binary name — read for context, then dropped                                        |
| `tag add`   | Bare words before the first `<`, `[`, or `--` token: the **route**, `commands/tag/add.ts`       |
| `<name>`    | A **required** positional arg (`args: [{ name: 'name', required: true }]`)                      |
| `[name]`    | An **optional** positional arg (`required: false`)                                              |
| `--force`   | A flag with no following value (or followed by another `--`/`<`/`[` token): **boolean**         |
| `--count 3` | A flag followed by a value: type **inferred** from the value (`number`, `boolean`, or `string`) |

A single-segment route (`cli ping`) writes a top-level file
(`commands/ping.ts`) instead of a nested one.

```bash
$ bunx concise-ti scaffold
? What should the command look like? cli tag add <name> --force
? Command description? Add a tag to an item

Overview
  Route:       tag add
  Description: Add a tag to an item
  Args:        <name>
  Flags:       --force (boolean)
  File:        commands/tag/add.ts

? Create this command? (Y/n)
✓ Created tag/add.ts
```

Generates:

```typescript
import { command } from 'concise-ti'

export default command({
  meta: { description: 'Add a tag to an item' },
  flags: {
    force: { type: 'boolean' },
  },
  args: [{ name: 'name', required: true }],
  run(ctx) {},
})
```

`run(ctx)` is always generated empty — `scaffold` only writes the boilerplate
and the declared shape, never guesses at behavior.

## See also

- [Project Init](project-init.md): scaffolds the CLI itself, before there's anything to add commands to
- [Building Commands](../building-commands.md): flags, positionals, and I/O once the file exists
- [Command Routing](../../features/command-routing.md): how `commands/tag/add.ts` becomes the `tag add` route
