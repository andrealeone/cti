## Demos

The [`/demos`](../../demos) folder holds small, self-contained example CLIs
built with CTI, each one a single readable file you can run, read, copy, and
adapt. They cover both onboarding patterns (`defineManifest` for a handful of
inline commands, `discoverManifest`/filesystem discovery for many) and every
`ctx.io` primitive.

The full demo list, what each one demonstrates, and the exact commands to run
them live in the demos folder's own **[README](../../demos/readme.md)**. That's
the canonical reference, kept next to the code it describes.

### Quick taste

```bash
bun run ./demos/hello-world/main.ts hello Alice
bun run ./demos/api-client/main.ts users get 2
echo '{"name":"Alice"}' | bun run ./demos/data-transform/main.ts format json
```

Or compile any demo to a standalone binary:

```bash
cd demos/hello-world
bun build ./main.ts --compile --outfile dist/hello && ./dist/hello hello Bob
```

### How they stay correct

A single black-box harness (`tests/demos.test.ts`) spawns every demo and checks
its exit code and key output fragments; a demo added without a matching
`EXPECTATIONS` entry fails the suite. See [Testing](../contributing/testing.md).
