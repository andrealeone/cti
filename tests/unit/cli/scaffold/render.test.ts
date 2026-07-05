import { describe, test, expect } from 'bun:test'

import { parseCommandString } from '../../../../cli/lib/scaffold/parse'
import { renderCommandModule, routeToFilePath } from '../../../../cli/lib/scaffold/render'

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
