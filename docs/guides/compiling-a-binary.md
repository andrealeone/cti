## Compiling a Binary

concise-ti CLIs ship as standalone binaries via Bun's `bun build --compile`. This
guide covers the one wrinkle: which build command to use depends on how your
CLI builds its manifest.

### Which command do I need?

| Your `Config` has...                                    | Compile with          | Why                                                                    |
| ------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `manifest: defineManifest({...})`                       | `bun build --compile` | An inline manifest is plain data; no filesystem access involved.       |
| `commandsDir: '...'` (or omitted, default `'commands'`) | `concise-ti compile`  | `discoverManifest` scans real files, which a compiled binary can't do. |

If you're not sure which shape your CLI uses: if your entrypoint's `run()`
call includes `manifest`, it's the inline shape. If it doesn't, it discovers
commands from a directory, and needs `concise-ti compile`.

### Compiling a directory-scanned CLI

```bash
bunx concise-ti compile ./main.ts --outfile dist/my-cli
./dist/my-cli hello Alice
```

Your entrypoint needs no changes for this to work — it's still just:

```typescript
import { run } from 'concise-ti'

void run({ name: 'my-cli', version: '1.0.0', commandsDir: 'commands' }, import.meta)
```

Flags after the entry path are forwarded straight to `bun build`, so anything
you'd normally pass to `bun build --compile` still works:

```bash
concise-ti compile ./main.ts --outfile dist/my-cli --minify --target=bun-linux-x64
```

### What it actually does

`bun build --compile` bundles your entry file before any of your code runs,
so nothing your CLI does at runtime can make the bundler include files it
hasn't seen. `concise-ti compile` works around this in three steps:

1. Runs your entry once as a normal (uncompiled) `bun run` process to resolve
   its manifest — the same `discoverManifest` call `run()` always makes,
   just executed ahead of time, in an environment where scanning the
   filesystem actually works.
2. Feeds that resolved manifest into the framework itself, so `run()` can
   find it later without touching the filesystem.
3. Compiles your entry file, completely unmodified, with `bun build
--compile`.

Nothing is written into your project: the substitution happens inside
`node_modules/concise-ti` and is reverted the moment the build finishes, so
there's no generated file to `.gitignore` and `bun run` never sees anything
different. See [Manifest](../features/manifest.md#compiling-a-commandsdir-cli-to-a-binary)
for the full mechanism, and [Core Module](../architecture/core.md#compileargv)
for the implementation.

### Compiling an inline-manifest CLI

No wrapper needed; compile it exactly like any other Bun program:

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli hello Alice
```

### Troubleshooting

**"this binary was compiled with `bun build --compile` directly"** — you
compiled a `commandsDir` CLI without going through `concise-ti compile`.
Recompile with `concise-ti compile ./main.ts --outfile ...` instead.

**A command works under `bun run` but is missing from the compiled binary** —
recompile: `concise-ti compile` resolves the manifest fresh on every run, so
an out-of-date binary just needs rebuilding after you add or rename a command
file.

### Next Steps

- **[Manifest](../features/manifest.md)**: `defineManifest` vs `discoverManifest`, and the compile mechanism in full
- **[Core Module](../architecture/core.md)**: how `compile` is implemented
- **[Quick Start](../getting-started/quickstart.md)**: install, first command, first flag, compiled binary
