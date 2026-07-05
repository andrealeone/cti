---
name: about-cti
description: Explains what CTI is, the problem it solves, who it's for, and how it compares to alternatives like Yargs, Commander.js, and Oclif. Use whenever the user asks "what is CTI", whether they should use CTI for a CLI project, how CTI differs from another CLI framework, or wants the rationale/vision/philosophy behind CTI before deciding to adopt it. This skill is about understanding and evaluating CTI, not about writing CTI code; for that, use start-building-with-cti (new project) or migrate-to-cti (existing CLI) instead.
---

# About CTI

CTI is a Bun-native TypeScript framework for building command-line tools. You add it as a dependency, call it once in an entrypoint file, and write command files. CTI discovers them, parses their arguments, routes to them, and handles their output. There's no config file to maintain and no wiring code to write.

The name is literal: CTI is a Concise Terminal Interface, small, focused tooling for building terminal programs, not a do-everything framework.

## The problem it solves

Most CLI frameworks were built for Node.js, a runtime tuned for long-running network services, not short-lived processes. That mismatch shows up directly in CLI tools: a Node-based CLI typically starts in 300–500ms and ships as an 80–300MB binary, even when the actual command logic is a few kilobytes that runs in single-digit milliseconds. Users pay that startup tax on every invocation, and developers spend real time configuring tooling instead of writing commands.

CTI's bet is that CLI tools deserve a runtime engineered for their actual constraints (instant startup, tiny footprint, single-binary distribution) rather than a repurposed server runtime. Bun provides that runtime (native TypeScript execution, no build step, standalone binary compilation); CTI provides the structure CLIs still need on top of it: command registration, argument parsing, and I/O primitives like color, prompts, and spinners.

## Who it's for

Choose CTI if you are:

- Building a standalone CLI tool (not a server, not a library)
- Distributing a compiled, single-binary executable to end users
- Already on or willing to adopt Bun
- Looking for fast startup and small binaries without configuring it yourself
- Comfortable writing TypeScript and want full type safety on flags, args, and context

CTI is probably the wrong choice if you:

- Need to target Node.js specifically, or run in an environment without Bun
- Are building a server or anything HTTP-facing (reach for Hono, Elysia, etc.)
- Want an established, battle-tested ecosystem with a large plugin/extension surface (Oclif fits that need; CTI is intentionally small)
- Need built-in middleware, a database layer, or other application-framework concerns; CTI deliberately excludes all of that

## How it compares

|               | CTI                                                         | Yargs / Commander.js  | Oclif                         |
| ------------- | ----------------------------------------------------------- | --------------------- | ----------------------------- |
| Runtime       | Bun only                                                    | Node.js               | Node.js                       |
| Startup       | ~1–10ms                                                     | ~300–500ms            | ~300–500ms                    |
| Binary size   | ~10–50MB                                                    | ~100–300MB+           | ~100–300MB+                   |
| Command shape | Plain typed module (`CommandModule`)                        | Chained builder calls | Classes + plugin system       |
| TypeScript    | First-class, required mental model                          | Optional, bolted on   | Optional                      |
| Surface area  | Deliberately minimal: routing, parsing, I/O primitives only | Large, flexible       | Large, extensible via plugins |

CTI isn't trying to out-feature these libraries; it's trying to be the obvious choice for one job: fast, lean, standalone CLIs written in TypeScript on Bun. Yargs and Commander predate Bun and carry Node-era API design; Oclif is excellent for large CLI suites that need a plugin ecosystem, at the cost of more concepts to learn and a heavier runtime.

## Design principles

These shape every part of the framework, and explain _why_ it works the way it does:

- **Explicit over implicit.** No decorators, no auto-discovery magic, no hidden conventions. Commands are registered explicitly (`defineManifest({...})` or directory scanning via `discoverManifest`), config is an explicit object you build and pass to `run()`. Reading CTI code tells you exactly what happens.
- **Minimalism by default.** CTI ships only what CLI tools actually need: routing, flag/positional parsing with type coercion, and I/O primitives (color, spinner, prompt, confirm, select). No ORM, no web middleware, no plugin framework, no bundled logging framework beyond a basic logger. Fewer dependencies means faster startup and a smaller mental model.
- **Composition over configuration.** Instead of a JSON/YAML command tree, you write code: a manifest is a plain object mapping route strings to command modules. Configuration is code, and code is honest, with no separate schema to keep in sync.
- **TypeScript first.** Command handlers, flags, positionals, and context are all typed. Mistakes show up at compile time, not on a user's machine. This is treated as central, not an optional add-on.
- **Performance isn't optional.** Commands lazy-load (only imported when actually invoked), the core has no runtime dependencies beyond Bun/Node's stdlib, and startup time is measured in single-digit milliseconds as a design constraint, not an optimization pass done later.
- **Embrace the runtime.** CTI is Bun-specific by choice. It doesn't try to also run on Node; that constraint is what buys native TypeScript execution, standalone binary compilation, and a simpler codebase free of cross-runtime shims.

## What CTI explicitly isn't

- Not a web framework: no HTTP server, no middleware
- Not a general application framework: it's scoped to CLIs
- Not a task runner (it's not Makefile/npm-scripts replacement)
- Not a package manager
- Not a full terminal UI framework: it gives you color/spinner/prompt primitives, not a component system

## The shape of a CTI CLI, at a glance

```typescript
// main.ts: the entire entrypoint for a small CLI
import type { CommandModule } from './types/command'
import type { Config } from './types/config'
import { defineManifest, run } from './core/runtime'

const hello: CommandModule = {
  meta: { description: 'Greet someone' },
  run(ctx) {
    ctx.io.write(`Hello, ${ctx.positionals[0] ?? 'World'}!`)
  },
}

const config: Config = { name: 'my-cli', version: '1.0.0', manifest: defineManifest({ hello }) }
void run(config)
```

```bash
bun run ./main.ts hello Alice     # Hello, Alice!
bun build ./main.ts --compile --outfile dist/my-cli   # standalone binary
```

That's the whole pitch: write commands as plain typed modules, let CTI handle dispatch, ship a binary.

## Going further

If the user wants to actually start writing commands, structuring a new project, or applying CTI's conventions in code, switch to the **start-building-with-cti** skill. If the user has an existing CLI (in any framework or language) and wants to port it onto CTI, switch to the **migrate-to-cti** skill instead.
