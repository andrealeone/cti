## Testing

CTI's tests live in [`/tests`](../../tests) and run on Bun's built-in test
runner, with no third-party testing dependencies.

```bash
bun test              # everything
bun test tests/unit   # one layer
```

### Three layers

```
tests/
├── unit/            # fast, in-process tests of individual src/ modules
├── e2e/             # black-box tests of the compiled CLI (spawn the binary)
└── demos.test.ts     # one generic harness validating every demo under /demos
```

#### Unit

Unit tests mirror `src/` one-to-one: each module gets a sibling `*.test.ts`
(`src/core/parser.ts` → `tests/unit/core/parser.test.ts`). The modules are small
and mostly pure, so these tests are fast and direct. `prompt`/`spinner` are
currently non-interactive stubs; their tests pin the stub contract so a future
real implementation is a deliberate, test-visible change.

#### E2E

E2E tests drive a real CLI (`tests/e2e/cli.ts`, a small `defineManifest` +
`run()` fixture) as a black box via `Bun.spawn`: argv in, stdout/stderr/exit
code out. This proves routing, flag parsing, dispatch, and I/O work together
end-to-end, not just in isolation.

#### Demos

A single data-driven harness (`tests/demos.test.ts`) validates every demo
end-to-end. Rather than hard-coding full transcripts or relying on snapshots, it
spawns each demo CLI and checks **exit code + a few key output fragments** against
a small declarative `EXPECTATIONS` table. It auto-discovers demo folders and fails
if one has no expectations, so coverage can't silently drift. The rationale and
trade-offs are documented in the [tests README](../../tests/README.md).

### What "green" means

The same checks gate changes locally:

```bash
bun run check:types   # tsc --noEmit over src, demos, and tests
bun run lint          # oxlint (type-aware)
bun test              # all layers
```

`check:types` and `lint` both cover `demos/` and `tests/` in addition to `src/`,
so an example that drifts from the real API is caught as a type or lint error, not
just at runtime.

The tests folder has its own [README](../../tests/README.md) with the full
structure and the demo-validation strategy.
