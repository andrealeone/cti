## Vision

### The Problem

Most CLI frameworks were built for Node.js-a runtime optimized for network I/O and server workloads. But CLI tools are different. They run once and exit. Milliseconds matter. Deployment is a single binary, not `npm install` on the user's machine.

Existing frameworks pretend this doesn't matter. They inherit Node's baggage: slower startup, larger distribution size, bloated abstractions that made sense for servers but not for CLIs.

The result: a CLI built with a Node-oriented framework spends noticeable time in framework startup before your actual logic runs, and ships a `node_modules`-sized distribution for a program that's a few kilobytes of real code. You spend more time configuring tooling than writing commands.

### The Insight

CLI applications need a runtime engineered for their constraints, not a repurposed server runtime.

Enter Bun. It's fast to start, runs TypeScript natively (no build step), and compiles to standalone binaries. It's everything Node.js isn't for this use case.

concise-ti is built on Bun. But Bun alone isn't enough. You still need structure: how do you register commands? How do you parse arguments? How do you handle colors, prompts, and other CLI primitives?

concise-ti answers those questions with an opinionated but minimal framework. We include what CLI tools actually need-routing, parsing, I/O primitives-and nothing else. No database abstractions. No ORM. No middleware. Just command handling, done well.

### What We're Building

A world where:

1. **CLI development is fast.** Write a command, run it instantly. No build step, no hot-reload nonsense. Native TypeScript in Bun is instant.

2. **CLIs are fast.** Startup in single-digit milliseconds. Users don't wait for your CLI to initialize. Your code runs immediately.

3. **Distribution is trivial.** Compile once with `bun build --compile`. You get a self-contained binary. No runtime to install, no dependency hell. Ship it and move on.

4. **Code is clear.** Strong types everywhere. Commands are explicit. No magic, no hidden conventions. You read the code and understand it immediately.

5. **Composition is natural.** Commands are plain modules. Write one once, import it across projects. No bespoke extension system to learn.

That's the vision. A CLI framework that respects your time and your users' experience.

### The Opportunity

Right now, most developers build CLIs with tools that weren't designed for the job. They accept slow startup as inevitable. They expect bloated binaries. They've forgotten what a lightweight, fast CLI feels like.

We're going to remind them.

concise-ti isn't trying to be everything to everyone. It's trying to be the best choice for building fast, tight, standalone CLI applications. Not servers. Not data pipelines. Not scientific computing. CLIs.

Do that one thing exceptionally well, and you've built something worth using.
