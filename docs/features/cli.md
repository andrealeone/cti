# The `concise-ti` CLI

Installing `concise-ti` also installs a small bin of its own (`cli/` in this
repo, published as the `concise-ti` command), separate from the framework
your own commands are built on. It exists to get a project off the ground and
to keep it growing, not to run at your CLI's own dispatch time.

```bash
bunx concise-ti <command>
```

| Command               | Does                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `concise-ti init`     | Wizard: bootstrap a new CLI, or add one to the current project                                                           |
| `concise-ti scaffold` | Wizard: generate a new command file for a discovery-based CLI                                                            |
| `concise-ti compile`  | Compile a `commandsDir` CLI to a standalone binary (see [Manifest](manifest.md#compiling-a-commandsdir-cli-to-a-binary)) |

Full walkthroughs live in **[guides/cli/](../guides/cli/)**:
[Project Init](../guides/cli/project-init.md) and
[Scaffolding Commands](../guides/cli/scaffolding-commands.md).

## Why a separate prompt implementation

`init` and `scaffold` are interactive wizards: they ask questions and read
real answers from stdin. `ctx.io.prompt/confirm/select` (the primitives your
own commands get) are non-interactive stubs today — see
[Prompts](prompts.md) — so the bin's wizards are built on their own small
helper, `cli/lib/prompt.ts`, instead. It's deliberately not the same code
path: a framework consumer's commands must keep behaving exactly the same
once `ctx.io.prompt` is implemented for real, so this wizard-only UI doesn't
reuse or influence that contract in either direction.

## Why templates are fetched from GitHub

A compiled `concise-ti` binary has no access to this repo's `/demos` folder —
it isn't bundled into the binary. `init` instead downloads the requested
template's files straight from `github.com/andrealeone/cti` at run time
(GitHub's git-trees API for the file listing, `raw.githubusercontent.com` for
each file's content), always from `main`. This means:

- `concise-ti init` requires network access.
- Unauthenticated GitHub API requests are capped at 60/hour per IP — enough
  for interactive use, not for scripting a fleet of them back to back.
- Templates always reflect the current `main`, not the version of
  `concise-ti` you have installed.

## Command auto-discovery

Both wizards need to tell a manifest-based CLI (`defineManifest`) from a
discovery-based one (`commandsDir`) apart. There's no AST tooling in this
dependency-free codebase, so detection (`cli/lib/detect.ts`) is a regex
heuristic over the entrypoint's source — good enough for CLIs written the
conventional way, not a real static analysis. See
[Scaffolding Commands](../guides/cli/scaffolding-commands.md) for what it
looks for.

## See also

- [Manifest](manifest.md): `defineManifest` vs. `discoverManifest`, and how `compile` works around a compiled binary's virtual filesystem
- [Compiling a Binary](../guides/compiling-a-binary.md): which compile command a generated project needs
- [Prompts](prompts.md): why `ctx.io.prompt/confirm/select` are stubs, and why the bin's wizards don't use them
