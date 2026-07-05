import { describe, test, expect } from 'bun:test'

import {
  createPackageJson,
  renderPackageJson,
  withCliScript,
  withDependency,
  withFixedBuildScript,
  withName,
} from '../../../../cli/lib/init/package-json'

describe('createPackageJson', () => {
  test('produces a minimal package.json with a cli script', () => {
    const pkg = createPackageJson('my-cli')

    expect(pkg.name).toBe('my-cli')
    expect(pkg.scripts?.cli).toBe('bun run ./main.ts')
  })
})

describe('withCliScript', () => {
  test('adds a cli script without touching existing scripts', () => {
    const pkg = withCliScript({ scripts: { dev: 'bun run ./main.ts', build: 'echo build' } })

    expect(pkg.scripts).toEqual({
      dev: 'bun run ./main.ts',
      build: 'echo build',
      cli: 'bun run ./main.ts',
    })
  })
})

describe('withDependency', () => {
  test('adds a dependency that is not yet present', () => {
    const pkg = withDependency({}, 'concise-ti', '^1.0.0')

    expect(pkg.dependencies).toEqual({ 'concise-ti': '^1.0.0' })
  })

  test('does not overwrite an existing pinned version', () => {
    const pkg = withDependency({ dependencies: { 'concise-ti': '^0.5.0' } }, 'concise-ti', '^1.0.0')

    expect(pkg.dependencies).toEqual({ 'concise-ti': '^0.5.0' })
  })
})

describe('withName', () => {
  test('overwrites the name field', () => {
    expect(withName({ name: 'old' }, 'new').name).toBe('new')
  })
})

describe('withFixedBuildScript', () => {
  test('rewrites the monorepo-internal build script to the installed bin', () => {
    const pkg = withFixedBuildScript({
      scripts: { build: 'bun ../../bin/cli.ts compile ./main.ts --outfile dist/x' },
    })

    expect(pkg.scripts?.build).toBe('concise-ti compile ./main.ts --outfile dist/x')
  })

  test('leaves an unrelated build script untouched', () => {
    const pkg = withFixedBuildScript({
      scripts: { build: 'bun build ./main.ts --compile --outfile dist/x' },
    })

    expect(pkg.scripts?.build).toBe('bun build ./main.ts --compile --outfile dist/x')
  })

  test('is a no-op when there is no build script', () => {
    const pkg = withFixedBuildScript({ scripts: { dev: 'bun run ./main.ts' } })

    expect(pkg.scripts?.build).toBeUndefined()
  })
})

describe('renderPackageJson', () => {
  test('renders pretty JSON with a trailing newline', () => {
    const rendered = renderPackageJson({ name: 'x' })

    expect(rendered).toBe('{\n  "name": "x"\n}\n')
  })
})
