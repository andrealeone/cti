## concise-ti Documentation

A complete guide to concise-ti, a Bun-native TypeScript framework for building
command-line tools.

```
principles/          why concise-ti exists, what it trades off
getting-started/      five minutes to a working CLI
concepts/              the mental model: commands, manifest, runtime
guides/                 patterns, examples, runnable demos
features/              one page per user-facing capability
architecture/          how each module is actually built
reference/              full type & function reference
contributing/           dev workflow, testing
future/                 roadmap
```

### New to concise-ti?

1. **[Quick Start](getting-started/quickstart.md)**: install, first command, first flag, compiled binary
2. **[Core Concepts](concepts/core-concepts.md)**: commands, manifest, runtime, in one page
3. **[Vision](principles/vision.md)** and **[Philosophy](principles/philosophy.md)** explain why concise-ti exists and what it deliberately leaves out

### Building a CLI

- **[Building Commands](guides/building-commands.md)**: flags, positionals, I/O, error handling, testing
- **[Examples](guides/examples.md)**: real-world command patterns to copy
- **[Demos](guides/demos.md)**: runnable example CLIs in [`/demos`](../demos)
- **[Features](features/)**: one page per capability, including [flags](features/flag-parsing.md), [positionals](features/positional-arguments.md), [routing](features/command-routing.md), [manifest](features/manifest.md), [colors](features/colors.md), [prompts](features/prompts.md), [spinners](features/spinners.md), and [logger](features/logger.md)

### Understanding the internals

- **[Core Module](architecture/core.md)**: runtime, router, parser
- **[I/O System](architecture/io.md)**: color, spinner, prompt, logger implementations
- **[Type System](architecture/types.md)**: every interface, and why it's shaped that way
- **[Utilities](architecture/utils.md)**: coercion, TTY detection
- **[API Reference](reference/api-reference.md)**: the complete type and function list

### Contributing

- **[Contributing Guide](contributing/guide.md)**: setup, workflow, code style, bug reports
- **[Testing](contributing/testing.md)**: the three test layers and how to run them
- **[Roadmap](future/roadmap.md)**: what's done, what's next, and why it's prioritized that way

---

Docs describe the current source, not aspirations. If a page and the code
disagree, the code wins and the page is a bug: report it like any other.
