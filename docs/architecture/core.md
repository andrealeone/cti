## Core Module: Runtime, Router & Parser

The core module is concise-ti's command dispatch engine, where argv becomes command
execution. It's four files:

- **Runtime** (`runtime.ts`): `run()` and `defineManifest()`
- **Discovery** (`discovery.ts`): `discoverManifest()`, the filesystem-scanning counterpart to `defineManifest`
- **Router** (`router.ts`): route resolution and lookup building
- **Parser** (`parser.ts`): raw argv → typed flags and positionals

The flow is: **argv → resolve manifest → resolve route → parse flags → build context → invoke command**.

### `run(config, importMeta?, argv?)`

The main dispatcher. If `config.manifest` is set, it's used as-is; otherwise
`run()` calls `discoverManifest(config.commandsDir ?? 'commands')`, resolved
relative to `importMeta.dir` (required in that case, since that's how `run()`
finds your `commands/` directory without you hardcoding a path).

```typescript
const config: Config = { name: 'demo', version: '1.0.0', manifest: defineManifest({ hello }) }
const exitCode = await run(config)
```

Internally it:

1. Resolves the manifest (`config.manifest` or discovery)
2. Matches `argv` against it, using a longest-prefix route match
3. Lazily imports the matched command module
4. Parses and coerces the remaining argv into typed flags
5. Builds the `Context` and calls `command.run(ctx)`
6. Returns the command's numeric result, or `0`

An unmatched route or a thrown error is caught inside `run()` itself: it writes
a message to stderr and resolves to exit code `1`, so your entrypoint never
needs a try/catch around `run()`.

### `defineManifest(routes)`

Builds a `Manifest` from a flat `{ route: CommandModule }` map:

```typescript
const manifest = defineManifest({
  hello: helloCommand,
  'users/list': usersListCommand,
  'users/get': usersGetCommand,
})
```

### `discoverManifest(commandsDir)`

Walks `commandsDir` recursively, and for every `.ts` file (skipping `*.test.ts`)
builds a route from its path relative to `commandsDir` (`index.ts` collapses
into its parent's route) and dynamically imports its default export. See
[Manifest](../features/manifest.md) for the full comparison with `defineManifest`.

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

| Function              | Module         | Purpose                                        |
| ---------------------- | -------------- | ----------------------------------------------- |
| `run()`                | `runtime.ts`   | Main dispatcher: argv → command → exit code      |
| `defineManifest()`     | `runtime.ts`   | Build a manifest from an in-memory route map     |
| `discoverManifest()`   | `discovery.ts` | Build a manifest by scanning a directory         |
| `buildRouteLookup()`   | `router.ts`    | Convert a manifest into a fast lookup map        |
| `resolveRoute()`       | `router.ts`    | Longest-prefix route matching                    |
| `parseAndCoerce()`     | `parser.ts`    | Parse argv and coerce to typed flags             |

### Related

- **[Core Concepts](../concepts/core-concepts.md)**: the dispatch flow, end to end
- **[Manifest](../features/manifest.md)**: `defineManifest` vs `discoverManifest`
- **[Utils: Coerce](utils.md)**: type coercion details
- **[Type System](types.md)**: `FlagSpec`, `Manifest`, `Config`
