# Tests

Bun's built-in test runner (`bun test`). No third-party testing dependencies.

```
tests/
├── unit/           # fast, in-process tests of individual src/ modules (pure functions, factories)
├── e2e/            # black-box tests of the compiled CLI (spawn the binary, assert argv→output)
└── demos.test.ts   # one generic harness validating every demo under /demos end-to-end
```

Run everything:

```bash
bun test
```

Run a layer:

```bash
bun test tests/unit
bun test tests/demos.test.ts
bun test tests/e2e
```

## Unit test structure

Unit tests mirror `src/` one-to-one. Every module is small and (mostly) pure, so
each gets a sibling `*.test.ts`:

| Source                | Test                        | Covers                                             |
| --------------------- | --------------------------- | -------------------------------------------------- |
| `src/core/command.ts`   | `unit/core/command.test.ts`   | `command()` helper                                          |
| `src/core/discovery.ts` | `unit/core/discovery.test.ts` | `discoverManifest` (routing, `index.ts` collapse, skips)     |
| `src/core/parser.ts`    | `unit/core/parser.test.ts`    | `toParseArgsOptions`, `parseAndCoerce`                       |
| `src/core/router.ts`    | `unit/core/router.test.ts`    | `buildRouteLookup`, `resolveRoute` (longest-match)           |
| `src/core/runtime.ts`   | `unit/core/runtime.test.ts`   | `defineManifest`, `run` (inline + directory-discovery paths) |
| `src/io/color.ts`     | `unit/io/color.test.ts`     | `colorize` (NO_COLOR / FORCE_COLOR)                |
| `src/io/index.ts`     | `unit/io/index.test.ts`     | `createIo`, `createLogger`                         |
| `src/io/prompt.ts`    | `unit/io/prompt.test.ts`    | `prompt`, `confirm`, `select` (current stubs)      |
| `src/io/spinner.ts`   | `unit/io/spinner.test.ts`   | `createSpinner` (no-op handle shape)               |
| `src/utils/coerce.ts` | `unit/utils/coerce.test.ts` | `coerceValue`                                      |
| `src/utils/tty.ts`    | `unit/utils/tty.test.ts`    | `shouldUseColor`, `isTTY` (env precedence)         |

Type-only files under `src/types/` need no tests; they are exercised indirectly.
`prompt`/`spinner` are currently non-interactive stubs. Their tests pin the stub
contract so a future real implementation becomes a deliberate, test-visible change.

## E2E test structure

E2E spawns the real CLI (`e2e/cli.ts`, driven via `run()` + `defineManifest`) and
asserts on argv → stdout/stderr/exit code, proving routing, parsing, dispatch,
and IO work together end-to-end. Suggested split as it grows:

- `e2e/dispatch.e2e.test.ts`: routing + positionals + unknown-command exit codes
- `e2e/flags.e2e.test.ts`: flag parsing/coercion, defaults, `--help`
- `e2e/io.e2e.test.ts`: color env handling, stderr vs stdout

## Demo validation strategy

`tests/demos.test.ts` is a **single, generic, data-driven harness**, per the task.

**How a demo is validated:** as a black box. The harness spawns each demo's CLI
the way a user would (`bun run <demo>/main.ts <args>`), pipes stdin/env, and
asserts on **exit code + a few key output fragments** (substrings or regexes),
never a byte-for-byte transcript.

**Why not hard-code full expected output in the test?** Full-string equality is
brittle: it breaks on ANSI color, spinner frames, trailing whitespace, and
harmless wording changes, producing failures that say nothing about whether the demo works.

**Why not Bun snapshots (`toMatchSnapshot`)?** Zero-dependency, but snapshots
_rot_: someone runs `--update`, rubber-stamps a regression, and the expectation is
opaque in review. They also break on non-deterministic output.

**Chosen approach: declarative invariants + generic runner (no deps).** A small
`EXPECTATIONS` table lists, per demo, the minimal observable facts that prove each
command did its job. The runner is shared logic; the data is per-demo and
reviewable. Properties this buys us:

- **Minimal & scalable**: one test file; adding a demo means adding a folder and a table
  entry, no new test code
- **No silent coverage gaps**: the harness discovers every demo folder on disk and
  fails if one has no `EXPECTATIONS` entry (`every demo has an expectations entry`)
- **Robust**: `NO_COLOR=1` for stable output; substring/regex tolerates cosmetics
- **Safe**: stateful demos (todo-app, project-init) run with a throwaway `$HOME`,
  so tests never touch the real machine
- **Real**: exercises the actual CLI, not its internals

### Status: passing

All demos now run against the real, manifest-based API and the harness is green.

History worth knowing: the demos were originally written against an API described
in an earlier draft of `docs/` (a `Router` class with `router.command(...)`), which
`src/` never implemented, so they failed to even import. They were rewritten to use
the actual primitives, and the missing dispatcher (present in the Phase 0 spike's
`main.ts`, dropped by a later refactor) was restored as **`src/core/runtime.ts`**: a
`run()` + `defineManifest()` pair that composes `resolveRoute` + `parseAndCoerce` +
`createIo`. Each demo now defines `CommandModule`s, builds a manifest inline, and
calls `run()`. `docs/` has since been revised to match the real API described here.
