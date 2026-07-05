## Contributing

CTI is early: pre-1.0, still Phase 0 on the [Roadmap](../future/roadmap.md).
That means two things: contributions are genuinely welcome, and nothing about
the API is set in stone yet, so feedback on rough edges lands while it can
still shape the design.

### Setup

```bash
git clone https://github.com/andrealeone/cti.git
cd cti
bun install
```

```bash
bun test              # run the suite
bun test --watch      # watch mode
bun run check:types   # tsc --noEmit over src, demos, and tests
bun run lint          # oxlint
bun run format        # oxfmt
```

### Making a change

1. Branch from `main`: `git checkout -b feature/your-feature`
2. Write the change and its test alongside it (see [Testing](testing.md))
3. `bun run check:types && bun run lint && bun test`
4. Commit with a conventional prefix: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`
5. Open a pull request

### Code style

- `const` by default, `let` when reassigned, never `var`
- Avoid `any`; use `unknown` when a type is genuinely unknown
- Files: kebab-case. Functions/variables: camelCase. Types/interfaces: PascalCase.
- Formatting and linting are enforced by `oxfmt`/`oxlint`, not by hand: run
  `bun run format` and `bun run lint:fix` rather than reformatting manually

### Where help is most useful right now

- **Testing**: new platforms, terminal emulators, edge cases
- **Documentation**: clarity, accuracy against the current source, missing examples
- **The Phase 1 items** on the [Roadmap](../future/roadmap.md): flag validation
  enforcement, `--help`/`--version` generation, shell completions
- **Examples**: a real CLI you built with CTI, shared as an issue or a demo

If you're picking your first contribution, low-stakes options are a docs fix,
a new [demo](../guides/demos.md), or a bug report from actually using CTI.

### Testing your changes in another project

```bash
bun link              # inside the cti repo
cd /path/to/your/project
bun link cti          # use the local build instead of a published version
```

Unlink with `bun unlink cti` and `bun install` to restore the published
version when you're done.

### Reporting a bug

Include what you expected, what actually happened, the exact steps to
reproduce, and your environment (`bun --version`, OS):

```markdown
## Bug: colors not applied on Windows Terminal

### Expected
`ctx.io.color(...)` output should be colored in an interactive terminal.

### Actual
Output is plain text, no ANSI codes.

### Steps
1. Run `my-cli deploy` in Windows Terminal
2. Output has no color

### Environment
Bun 1.3.14, Windows 11, Windows Terminal
```

### Proposing a feature

State the use case before the solution: what are you trying to do, and why
doesn't the current API let you do it cleanly?

```markdown
## Feature: shell completions

### Use case
Tab-completing subcommands and flags in bash/zsh.

### Proposal
Generate completion scripts from the manifest, exposed as `--completions bash`.
```

This is already tracked on the [Roadmap](../future/roadmap.md), so check there
first so proposals build on what's planned rather than duplicating it.

### Releasing

Releases are handled by maintainers using the `version:*` scripts in
`package.json` (`version:major`, `version:minor`, `version:patch`, `version:rc`).
Contributors don't need to think about this.

### Questions

Open a discussion or issue on GitHub. Asking before starting a large change is
welcome, since it's cheaper than reworking it after the fact.
