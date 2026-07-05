# Default Commands

Every CLI built with `run()` gets two commands for free: `help` and `version`.
Neither needs to be declared in a manifest or discovered from disk — `run()`
adds them itself, at dispatch time, for any route not already defined.

## `help`

Lists every non-`hidden` route in the resolved manifest (user-defined,
discovered, or default), with a heading and each route's `meta.description`:

```
my-cli 1.2.0 (built with concise-ti)

Commands:
  deploy          Deploy to an environment
  users/list      List users
  help            Show available commands
  version         Show CLI version
```

Pass `--json` for a structured version of the same listing, meant for
scripting or shell-completion generators:

```bash
my-cli help --json
# {"name":"my-cli","version":"1.2.0","commands":[{"route":"deploy","description":"Deploy to an environment"}, ...]}
```

Running the CLI with **no arguments at all** dispatches to `help` as well —
there's no separate "no command given" error path.

```bash
my-cli
# same output as `my-cli help`
```

## `version`

Prints the same heading line `help` uses, on its own:

```bash
my-cli version
# my-cli 1.2.0 (built with concise-ti)
```

Both commands use `config.bin ?? config.name` and `config.version` for the
heading, and brand it with `(built with concise-ti)`.

## Overriding a default

Defining `help` or `version` yourself — inline in `defineManifest`, or as
`commands/help.ts` / `commands/version.ts` under a discovered `commandsDir` —
takes priority. `run()` only adds the default when the route isn't already
present in the resolved manifest:

```typescript
const help: CommandModule = {
  run(ctx) {
    ctx.io.write('custom help output')
  },
}

const config: Config = {
  name: 'my-cli',
  version: '1.0.0',
  manifest: defineManifest({ help }),
}
```

## `config.skip`

`Config.skip` is a list of slash-delimited routes to remove from dispatch
entirely, as if they'd never been registered:

```typescript
const config: Config = {
  name: 'my-cli',
  version: '1.0.0',
  manifest: defineManifest({ hello }),
  skip: ['version'],
}
```

With the above, `my-cli version` resolves to `Unknown command: version`
instead of the default output. `skip` applies uniformly to default commands,
manifest entries, and discovered commands alike — it's a denylist evaluated
before defaults are added, not a `help`/`version`-specific switch.

## See also

- [Manifest](manifest.md): how the manifest `help`/`version` are added to is built
- [Command Routing](command-routing.md): how routes (including the defaults) resolve against argv
- [API Reference](../reference/api-reference.md#config): `Config.skip`
