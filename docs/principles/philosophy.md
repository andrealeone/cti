## Philosophy

### Explicit over implicit

CTI has no hidden conventions or surprise behaviors:

- Commands are files; a route is the file's path. No annotations, no decorators, no registration step.
- Configuration is explicit: build a `Config` object, pass it to `run()`.
- Dispatch is explicit: `run(config, import.meta)` resolves argv → command.

Read CTI's code and you know what happens, with no searching for a decorator or a
plugin that's silently changing behavior.

### Minimalism by default

CTI ships what CLI tools need and stops there. Fewer dependencies means faster
startup; a smaller codebase means it's readable in an afternoon; fewer concepts
means a shorter path from "installed" to "shipped." If you need something CTI
doesn't provide, add it yourself; CTI won't bloat itself "just in case."

### Composition over configuration

Instead of a nested config format describing your command tree, you write
plain modules and let the filesystem (or an inline map) describe the tree:

```typescript
// commands/auth/login.ts, commands/auth/logout.ts: the directory *is* the config
```

Configuration is code. Code is honest; it can't drift from what actually runs.

### TypeScript first

Types are central, not optional. Command handlers, flags, context, config are
all typed, so mistakes surface at `bun run check:types`, not on a user's
machine. Types double as documentation: read a `CommandModule<F>` and you know
exactly what a command needs and produces.

### Performance isn't optional

Lazy command loading, a zero-dependency core, and Bun's native TypeScript
support are not tuning knobs; they're the starting point. A CLI shouldn't
notice CTI is there.

### Built for Bun, not portable everywhere

CTI doesn't try to run on Node.js. That's a constraint, embraced: native
TypeScript with no transpile step, `bun build --compile` for standalone
binaries, and a codebase with no cross-runtime shims to maintain.

---

### Where CTI differs

**vs. Yargs / Commander.js**: mature, widely used, and built for Node.js
years before Bun existed; their API surface reflects that history. CTI is
Bun-native, smaller, and assumes TypeScript from the start.

**vs. Oclif**: feature-rich, production-tested, designed for large CLI suites
with a plugin architecture and class-based commands. CTI is smaller and uses
plain modules with a thin dispatcher instead.

### What CTI isn't

- **A web framework.** Use Hono, Elysia, or similar for servers.
- **A general application framework.** It's for CLIs specifically.
- **A task runner.** It's not Make, Rake, or npm scripts.
- **A terminal UI framework.** It provides primitives (color, spinners, prompts), not a component system.

### Why choose it

Choose CTI if you're building a standalone CLI tool, want fast startup and
small compiled binaries, and would rather write plain TypeScript modules than
learn a configuration format. Don't reach for it if you're building a server,
need to target Node.js specifically, or want a batteries-included framework
with generated help, shell completions, and plugins today; those are on the
[Roadmap](../future/roadmap.md), not shipped yet.

CTI isn't trying to be everything. It's trying to be the obvious choice for
one thing: fast, small, standalone CLI applications.
