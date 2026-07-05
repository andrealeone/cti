## Core Module: Runtime, Router & Parser

The core module is concise-ti's command dispatch engine, where argv becomes command
execution. It's five files:

- **Runtime** (`runtime.ts`): `run()` and `defineManifest()`
- **Discovery** (`discovery.ts`): `discoverManifest()`, the filesystem-scanning counterpart to `defineManifest`
- **Router** (`router.ts`): route resolution and lookup building
- **Parser** (`parser.ts`): raw argv → typed flags and positionals
- **Compile** (`compile.ts`): `compile()`, backing the `concise-ti compile` bin command

The flow is: **argv → resolve manifest → filter `skip` → add default `help`/`version` → validate `entry` → resolve route → parse flags → build context → invoke command**.

### `run(config, importMeta?, argv?)`

The main dispatcher. If `config.manifest` is set, it's used as-is; otherwise
`run()` calls `discoverManifest(config.commandsDir ?? 'commands')`, resolved
relative to `importMeta.dir` (required in that case, since that's how `run()`
finds your `commands/` directory without you hardcoding a path).

```typescript
const config: Config = { name: 'demo', version: '1.0.0', manifest: defineManifest({ hello }) }
const exitCode = await run(config)
```

`run` is generic over `ConfigType extends Config`, so a CLI whose `Config`
carries extra fields can pass that type explicitly and have it flow through
to every command's `ctx.config`:

```typescript
void run<ApiClientConfig>(config, import.meta)
```

See [Type System: Config](types.md#config) and `demos/api-client`.

Internally it:

1. Resolves the manifest (`config.manifest` or discovery)
2. Filters out any route listed in `config.skip`
3. Adds default `help` and `version` entries for those two routes if not
   already defined, overridden, or skipped (see
   [Default Commands](../features/default-commands.md))
4. If `config.entry` is set, validates it against the final entry set (see
   below), throwing rather than resolving to an exit code if it's invalid
5. Matches `argv` against the result, using a longest-prefix route match —
   empty `argv` is treated as `[config.entry ?? 'help']`
6. Lazily imports the matched command module
7. Parses and coerces the remaining argv into typed flags
8. Builds the `Context` and calls `command.run(ctx)`
9. Returns the command's numeric result, or `0`

An unmatched route or a thrown error from a command's `run()` is caught
inside `run()` itself: it writes a message to stderr and resolves to exit
code `1`, so your entrypoint never needs a try/catch around `run()`. A
malformed or unresolvable `config.entry` is the one exception — it's a
config authoring mistake rather than user input, so `run()` throws
synchronously instead of degrading to exit code `1`.

### Default `help` and `version`

`run()` builds these two commands itself, closing over the final entry list
so `help`'s listing reflects defaults and skips consistently:

- **`help`**: writes a heading (`<bin> <version> (built with concise-ti)`)
  followed by every non-`hidden` route and its `meta.description`. `--json`
  prints the same data as `{ name, version, commands: [{ route, description }] }`.
  If `config.entry` overrides the default, appends a line noting it.
- **`version`**: writes just the heading line.

Both read `config.bin` (falling back to `config.name`) and `config.version`.
A route already present in the filtered manifest — user-defined or
discovered — is never overwritten; a route listed in `config.skip` is never
added.

### `config.entry`

Overrides the route dispatched to for empty argv (default `'help'`); see
[Default Commands](../features/default-commands.md#configentry).

### `defineManifest(routes)`

Builds a `Manifest` from a flat `{ route: CommandModule }` map:

```typescript
const manifest = defineManifest({
  'hello': helloCommand,
  'users/list': usersListCommand,
  'users/get': usersGetCommand,
})
```

### `discoverManifest(commandsDir)`

Walks `commandsDir` recursively, and for every `.ts` file (skipping `*.test.ts`)
builds a route from its path relative to `commandsDir` (`index.ts` collapses
into its parent's route) and dynamically imports its default export. See
[Manifest](../features/manifest.md) for the full comparison with `defineManifest`.

### `compile(argv)`

Backs the `concise-ti compile <entry> [...bun build flags]` bin command. It
exists because `discoverManifest`'s `readdirSync` scan works under `bun run`
but not inside a `bun build --compile` binary, which executes against a
virtual filesystem with no real `commands/` directory to see. Since `bun
build --compile` bundles the entry file before any user code runs, nothing
triggered from inside `run()` at runtime can retroactively make the bundler
embed command files.

`compile`:

1. Spawns the entry as a real (uncompiled) `bun run` subprocess with
   `CONCISE_TI_EXTRACT_MANIFEST` set to a temp path. `run()` checks that env
   var before dispatch: it resolves the manifest exactly as it normally would
   (`config.manifest`, or `discoverManifest`) and writes the result back as
   JSON instead of running a command. The entrypoint's `void run(config,
import.meta)` call needs no changes for this to work
2. If the entry used `config.manifest` (an inline manifest is plain data, no
   filesystem scan involved), shells out to `bun build --compile` directly
3. Otherwise renders a manifest module whose entries use a **literal-string**
   dynamic `import()` per discovered command (`renderManifestModule`); `bun
build --compile` can statically discover and embed a literal `import()`
   argument, unlike the computed path `discoverManifest` uses at runtime
4. Temporarily overwrites the framework's own `generated-manifest.ts`
   placeholder (`src/core/generated-manifest.ts`, inside
   `node_modules/concise-ti/`) with the rendered module, compiles the entry
   **unmodified**, then restores the placeholder
5. At runtime, `run()` detects it's executing inside a compiled binary
   (`importMeta.dir` starts with `/$bunfs/`) and imports
   `generated-manifest.ts` instead of calling `discoverManifest`

Nothing is ever written into the project's git tree: the substitution happens
inside the installed package's own `node_modules` copy and is reverted
immediately after the build. See
[Manifest](../features/manifest.md#compiling-a-commandsdir-cli-to-a-binary)
for the user-facing walkthrough.

### Router: `buildRouteLookup` and `resolveRoute`

`buildRouteLookup(manifest)` turns entries into a `Map<string, ManifestEntry>`
keyed by `route.join('/')`, so lookup is O(1) instead of a scan.

`resolveRoute(argv, lookup)` tries the **longest** possible prefix of argv
first, shrinking by one token until it finds a match:

```typescript
// User runs: my-cli deploy aws prod
// 1. Check 'deploy/aws/prod' → not found
// 2. Check 'deploy/aws'      → found. remaining = ['prod']
```

This is what makes nested commands and positional arguments coexist: a route
can be as specific as it needs to be, and whatever's left over becomes
positionals.

### Parser: `parseAndCoerce(args, flags)`

Converts a `FlagSpec` map into Node's `parseArgs` option format, runs
`parseArgs`, then coerces each parsed value to its declared type
(`coerceValue`, in [`utils.md`](utils.md)):

```typescript
parseAndCoerce(['--environment=prod', '--verbose', 'src/', 'dist/'], {
  environment: { type: 'string', default: 'staging' },
  verbose: { type: 'boolean', short: 'v' },
})
// → { values: { environment: 'prod', verbose: true }, positionals: ['src/', 'dist/'] }
```

Node's `parseArgs` only natively understands `string` and `boolean`; a numeric
`default` is stringified before being handed to `parseArgs` and coerced back to
a number afterward. Defaults are used as-is when a flag is omitted; they are
never run through coercion.

`FlagSpec` also declares `choices` and `validate`, but the parser does not
enforce either yet. See the [Roadmap](../future/roadmap.md).

### Why these design choices

**Node's `parseArgs`, not a custom parser.** No dependency, POSIX-compliant,
battle-tested by Node's own CLI tooling.

**A `Map` for routing, not linear scan.** Lookup is O(1) regardless of how many
commands a CLI registers.

**Lazy imports, not eager loading.** Only the matched command's module is
imported. A CLI with a hundred commands starts as fast as one with a single
command, because the other ninety-nine are never touched.

### Quick reference

| Function             | Module         | Purpose                                      |
| -------------------- | -------------- | -------------------------------------------- |
| `run()`              | `runtime.ts`   | Main dispatcher: argv → command → exit code  |
| `defineManifest()`   | `runtime.ts`   | Build a manifest from an in-memory route map |
| `discoverManifest()` | `discovery.ts` | Build a manifest by scanning a directory     |
| `buildRouteLookup()` | `router.ts`    | Convert a manifest into a fast lookup map    |
| `resolveRoute()`     | `router.ts`    | Longest-prefix route matching                |
| `parseAndCoerce()`   | `parser.ts`    | Parse argv and coerce to typed flags         |
| `compile()`          | `compile.ts`   | Back `concise-ti compile`                    |

### Related

- **[Core Concepts](../concepts/core-concepts.md)**: the dispatch flow, end to end
- **[Manifest](../features/manifest.md)**: `defineManifest` vs `discoverManifest`
- **[Default Commands](../features/default-commands.md)**: `help`, `version`, `config.skip`, and `config.entry`
- **[Utils: Coerce](utils.md)**: type coercion details
- **[Type System](types.md)**: `FlagSpec`, `Manifest`, `Config`
