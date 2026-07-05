# Project Init

`concise-ti init` is a wizard that gets a new CLI on its feet, or adds one to
a project you already have. It's built on the same `ctx.io.prompt/confirm/select`
primitives any concise-ti command gets (see [Prompts](../../features/prompts.md)),
and needs network access, since its templates are fetched live from GitHub
(see [why](../../features/cli.md#why-templates-are-fetched-from-github)).

```bash
bunx concise-ti init
```

## The wizard, step by step

**1. Where should this CLI live?**

- **Add a CLI to the current project** — writes into the current directory.
  Aborts if a `main.ts` already exists there (nothing is ever overwritten
  silently); if `package.json` exists, only the fields `init` cares about are
  patched in (see [package.json patching](#packagejson-patching) below), the
  rest of the file is left alone.
- **Create a new project folder** — asks for a project name, then creates
  `<cwd>/<project-name>/` and writes the template there in full, including
  its own `package.json` and `readme.md`. Aborts if that folder already
  exists and isn't empty.

**2. Command style?**

- **Recommended: command auto-discovery** — commands live as files under
  `commands/`, one route per file. Bootstrapped from the
  [`hello-world`](../../../demos/hello-world) demo.
- **Single-file, manifest-based configuration** — commands are wired inline
  in `main.ts` via `defineManifest`. Bootstrapped from
  [`hello-world-with-manifest`](../../../demos/hello-world-with-manifest).

Both starting points are the same two commands (`hello`/`goodbye`), so
switching your mind later is a matter of following
[Manifest](../../features/manifest.md), not redoing the wizard.

**3. Project name?** — used as the new folder's name (when creating one) and
patched into the generated `package.json`'s `name` field either way.

## `--from-demo <name>`

Skips the location/style questions and scaffolds any demo from
[`/demos`](../../../demos) straight into a new folder:

```bash
bunx concise-ti init --from-demo todo-app
```

Only asks for a project name, then always creates a new folder (never
touches the current directory). Available demo names are listed dynamically
from the repo's current `main` branch; passing an unknown one prints the
real list rather than a stale, hardcoded one.

## `package.json` patching

Whichever path you take, `init` ensures the resulting `package.json`:

- has its `name` field set to the project name you gave it
- declares `concise-ti` as a dependency, pinned to the version of `concise-ti`
  the `init` binary itself was built from
- has a `cli` script (`"cli": "bun run ./main.ts"`) — this repo's own
  convention for invoking a CLI in development, see the root
  [`package.json`](../../../package.json)
- has a working `build` script: demos under `/demos` that discover commands
  use `bun ../../bin/cli.ts compile ...` internally (a monorepo-only path),
  which `init` rewrites to `concise-ti compile ...` — the bin your generated
  project actually has, once `bun install` links it

Existing fields (`dev`, other scripts, `description`, …) are left untouched;
`init` only ever adds to or reconciles the fields above.

## After it runs

```bash
cd <project-name>   # only when a new folder was created
bun install
bun run cli hello World
```

## See also

- [Scaffolding Commands](scaffolding-commands.md): the next step once you have a discovery-based CLI and want to add more commands to it
- [Manifest](../../features/manifest.md): `defineManifest` vs. `discoverManifest` in full
- [Demos](../demos.md): every template `--from-demo` can pull from
