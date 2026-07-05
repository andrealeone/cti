## Roadmap

concise-ti is being built in phases. This is where the existing pieces are heading: the
`run()` / `defineManifest()` dispatcher, the router and parser, the I/O primitives,
and the type system. Every item here extends a component that already exists in the
source; we don't promise subsystems that aren't built.

### Phase 0: Foundation (Now)

Stabilise the core framework:

- [Done] Core router and command dispatch (`run`, `defineManifest`, `resolveRoute`)
- [Done] Argument and flag parsing with type coercion
- [Done] Type system
- [Done] I/O color output with TTY / NO_COLOR detection
- [Done] `concise-ti compile`: makes `commandsDir` discovery work in `bun build --compile` binaries
- [In Progress] Real `prompt` / `confirm` / `select` implementations (currently non-interactive stubs)
- [In Progress] Real spinner animation (currently a no-op stub)
- [In Progress] Complete documentation

**Timeline:** Q2–Q3 2026

**Focus:** Get the mental model right, stabilise interfaces, build a solid foundation.

### Phase 1: Sharper dispatch (Q3–Q4 2026)

Make the existing dispatcher and parser do more:

- **Flag validation**: enforce `FlagSpec.choices` and `validate` during parsing
- **`--help` and `--version`**: generated from command `meta` and `Config`
- **Friendlier errors**: "did you mean?" suggestions on unknown commands
- **Shell completions**: generate bash, zsh, and fish completion from the manifest

**Why:** These are the natural next steps for the dispatcher and parser that already ship.

### Phase 2: Richer I/O (Q4 2026–Q1 2027)

Build on the I/O primitives that already exist:

- **Structured output**: tables and lists layered over `ctx.io.write`
- **Progress bars**: for operations with measurable progress
- **Theming**: customizable color schemes over the existing `color` API

**Why:** As CLIs get more complex, they need better output primitives, without leaving the small, dependency-free I/O surface.

### Philosophy

concise-ti's roadmap follows these principles:

#### Increase Value Without Increasing Complexity

Every feature must justify its existence. We won't add features that:

- Break the mental model (keep it simple)
- Require heavy configuration (prefer conventions)
- Add external dependencies (Bun-native preferred)
- Slow startup significantly (speed matters)
- Are "just in case" (avoid speculative features)

#### Listen to Users

Ideas are driven by real problems, not imagination. If 100 developers ask for feature X, we'll consider it. If one maintainer thinks X is cool, we won't add it.

#### Stabilise APIs Early

Once released, APIs should be stable. We'll use major versions for breaking changes, but try to avoid them.

#### Optimize for CLI Use Cases

concise-ti is specifically for CLIs. Features that benefit other use cases (servers, libraries) are lower priority. If you want a server framework, use Hono.

### How to Influence the Roadmap

1. **Use concise-ti**: build things with it and discover real problems
2. **Open issues**: describe use cases, not solutions
3. **Contribute**: submit PRs for features you need
4. **Discuss**: join conversations on GitHub

---

The roadmap will evolve as concise-ti does. Check back often.
