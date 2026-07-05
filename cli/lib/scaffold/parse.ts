/**
 * Parses the command-string `concise-ti scaffold` asks for first, e.g.
 * `cli tag add <name> --force`, into a route, positional args, and flags.
 * The grammar (documented in docs/guides/cli/scaffolding-commands.md):
 *
 *  - Leading bare words before the first `<`, `[`, or `--` token are route
 *    segments (`tag add` → `commands/tag/add.ts`).
 *  - `<name>` is a required positional, `[name]` an optional one.
 *  - `--flag value` infers the flag's type from `value` (number/boolean/string);
 *    `--flag` with no following value (or followed by another token of the
 *    grammar) is a boolean flag.
 */

export interface ParsedArg {
  name: string
  required: boolean
}

export type FlagType = 'string' | 'number' | 'boolean'

export interface ParsedFlag {
  name: string
  type: FlagType
  example?: string
}

export interface ParsedCommand {
  bin?: string
  route: string[]
  args: ParsedArg[]
  flags: ParsedFlag[]
}

function isFlagToken(token: string): boolean {
  return token.startsWith('--')
}

/** Matches `<...>`/`[...]` shape regardless of whether the closing bracket is
 * actually present, so a malformed token (e.g. `<name`) stops route
 * collection and is rejected below, instead of being silently absorbed into
 * the route as a bare word. */
function looksLikeArgToken(token: string): boolean {
  return token.startsWith('<') || token.startsWith('[')
}

function inferFlagType(value: string): FlagType {
  if (value === 'true' || value === 'false') return 'boolean'
  if (value !== '' && !Number.isNaN(Number(value))) return 'number'
  return 'string'
}

export function parseCommandString(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) throw new Error('Command string cannot be empty.')

  let cursor = 0
  const bin = isFlagToken(tokens[0]) || looksLikeArgToken(tokens[0]) ? undefined : tokens[cursor++]

  const route: string[] = []
  while (cursor < tokens.length) {
    const token = tokens[cursor]
    if (isFlagToken(token) || looksLikeArgToken(token)) break
    route.push(token)
    cursor++
  }

  if (route.length === 0)
    throw new Error('Could not find a command route (e.g. "tag add") in the input.')

  const args: ParsedArg[] = []
  const flags: ParsedFlag[] = []

  while (cursor < tokens.length) {
    const token = tokens[cursor]

    if (isFlagToken(token)) {
      const name = token.slice(2)
      const next = tokens[cursor + 1]

      if (next !== undefined && !isFlagToken(next) && !looksLikeArgToken(next)) {
        flags.push({ name, type: inferFlagType(next), example: next })
        cursor += 2
      } else {
        flags.push({ name, type: 'boolean' })
        cursor += 1
      }
      continue
    }

    if (token.startsWith('<')) {
      if (!token.endsWith('>'))
        throw new Error(`Malformed argument token "${token}"; expected "<name>".`)
      args.push({ name: token.slice(1, -1), required: true })
      cursor++
      continue
    }

    if (token.startsWith('[')) {
      if (!token.endsWith(']'))
        throw new Error(`Malformed argument token "${token}"; expected "[name]".`)
      args.push({ name: token.slice(1, -1), required: false })
      cursor++
      continue
    }

    throw new Error(`Unexpected token "${token}" after the command route.`)
  }

  return { bin, route, args, flags }
}
