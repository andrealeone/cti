import { describe, test, expect } from 'bun:test'

import {
  parseCommandString,
  renderCommandModule,
  routeToFilePath,
} from '../../../cli/lib/scaffold-parse'

describe('parseCommandString', () => {
  test('parses a bin name, nested route, required arg, and boolean flag', () => {
    const parsed = parseCommandString('cli tag add <name> --force')

    expect(parsed.bin).toBe('cli')
    expect(parsed.route).toEqual(['tag', 'add'])
    expect(parsed.args).toEqual([{ name: 'name', required: true }])
    expect(parsed.flags).toEqual([{ name: 'force', type: 'boolean' }])
  })

  test('parses an optional arg and a valued flag, inferring its type', () => {
    const parsed = parseCommandString('cli deploy [region] --count 3 --dry-run')

    expect(parsed.route).toEqual(['deploy'])
    expect(parsed.args).toEqual([{ name: 'region', required: false }])
    expect(parsed.flags).toEqual([
      { name: 'count', type: 'number', example: '3' },
      { name: 'dry-run', type: 'boolean' },
    ])
  })

  test('infers a boolean-typed flag value', () => {
    const parsed = parseCommandString('cli sync --verbose true')

    expect(parsed.flags).toEqual([{ name: 'verbose', type: 'boolean', example: 'true' }])
  })

  test('infers a string-typed flag value', () => {
    const parsed = parseCommandString('cli sync --env production')

    expect(parsed.flags).toEqual([{ name: 'env', type: 'string', example: 'production' }])
  })

  test('supports a single-segment route', () => {
    const parsed = parseCommandString('cli ping')

    expect(parsed.route).toEqual(['ping'])
    expect(parsed.args).toEqual([])
    expect(parsed.flags).toEqual([])
  })

  test('throws on an empty string', () => {
    expect(() => parseCommandString('   ')).toThrow('Command string cannot be empty.')
  })

  test('throws when no route can be found', () => {
    expect(() => parseCommandString('cli --force')).toThrow(/Could not find a command route/)
  })

  test('throws on a malformed bracket token', () => {
    expect(() => parseCommandString('cli tag <name')).toThrow(/Malformed argument token/)
  })
})

describe('routeToFilePath', () => {
  test('joins nested route segments into a file path', () => {
    expect(routeToFilePath(['tag', 'add'])).toBe('tag/add.ts')
  })

  test('renders a single-segment route as a top-level file', () => {
    expect(routeToFilePath(['ping'])).toBe('ping.ts')
  })
})

describe('renderCommandModule', () => {
  test('renders an empty run(ctx) body and includes args/flags blocks', () => {
    const parsed = parseCommandString('cli tag add <name> --force')
    const rendered = renderCommandModule(parsed, 'Add a tag')

    expect(rendered).toContain("import { command } from 'concise-ti'")
    expect(rendered).toContain('meta: { description: "Add a tag" }')
    expect(rendered).toContain('"force": { type: "boolean" }')
    expect(rendered).toContain('{ name: "name", required: true }')
    expect(rendered).toContain('run(ctx) {}')
  })

  test('omits args/flags blocks when there are none', () => {
    const parsed = parseCommandString('cli ping')
    const rendered = renderCommandModule(parsed, 'Ping the server')

    expect(rendered).not.toContain('args:')
    expect(rendered).not.toContain('flags:')
  })

  test('quotes flag keys that are not valid bare identifiers', () => {
    const parsed = parseCommandString('cli deploy --dry-run')
    const rendered = renderCommandModule(parsed, 'Deploy the app')

    expect(rendered).toContain('"dry-run": { type: "boolean" }')
    // Regression check: an unquoted `dry-run: {...}` is invalid JS/TS syntax.
    expect(rendered).not.toMatch(/[^"]dry-run:/)
  })
})
