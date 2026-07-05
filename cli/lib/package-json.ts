/**
 * Small, pure helpers for creating or patching a project's `package.json` from
 * `concise-ti init`. Patching only ever adds/overwrites the specific fields
 * `init` cares about (the `concise-ti` dependency, the `cli` script, the
 * project name) and otherwise leaves an existing file untouched.
 */

export interface PackageJson {
  name?: string
  version?: string
  description?: string
  type?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  [key: string]: unknown
}

export function createPackageJson(name: string): PackageJson {
  return {
    name,
    version: '1.0.0',
    type: 'module',
    scripts: { cli: 'bun run ./main.ts' },
    dependencies: {},
  }
}

/** Adds the `cli` script (this repo's own convention: see the root `package.json`). */
export function withCliScript(pkg: PackageJson, entry = './main.ts'): PackageJson {
  return { ...pkg, scripts: { ...pkg.scripts, cli: `bun run ${entry}` } }
}

export function withDependency(pkg: PackageJson, name: string, version: string): PackageJson {
  return {
    ...pkg,
    dependencies: { ...pkg.dependencies, [name]: pkg.dependencies?.[name] ?? version },
  }
}

export function withName(pkg: PackageJson, name: string): PackageJson {
  return { ...pkg, name }
}

/** `demos/*`'s own `build` scripts shell out to this monorepo's dev-only
 * `bin/cli.ts` (`bun ../../bin/cli.ts compile ...`), which doesn't exist once
 * copied into a real project. Rewrite it to the installed `concise-ti` bin,
 * available via `node_modules/.bin` after `bun install`. */
const INTERNAL_BUILD_PREFIX = 'bun ../../bin/cli.ts compile'

export function withFixedBuildScript(pkg: PackageJson): PackageJson {
  const build = pkg.scripts?.build

  if (!build || !build.includes(INTERNAL_BUILD_PREFIX)) return pkg

  return {
    ...pkg,
    scripts: { ...pkg.scripts, build: build.replace(INTERNAL_BUILD_PREFIX, 'concise-ti compile') },
  }
}

export function renderPackageJson(pkg: PackageJson): string {
  return `${JSON.stringify(pkg, null, 2)}\n`
}
