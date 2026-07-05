import { createInterface, type Interface } from 'node:readline'

import { colorize } from '@/io/color'

/**
 * Real, interactive prompt primitives for the `concise-ti` bin's own wizards
 * (`init`, `scaffold`). Deliberately separate from `ctx.io.prompt/confirm/select`
 * in `@/io/prompt`, which are non-interactive stubs by design (see
 * docs/features/prompts.md) — a framework consumer's commands must keep
 * behaving the same once those are implemented for real, so this wizard-only
 * UI doesn't reuse or influence that contract.
 *
 * Lines are read through the readline interface's async-iterator protocol
 * rather than repeated `.question()` calls: `.question()` attaches a
 * one-shot 'line' listener, so if several answers arrive in a single stdin
 * chunk (always true for piped/scripted input, e.g. tests), every line past
 * the first is emitted with no listener attached and silently lost. The
 * async iterator queues emitted lines instead, so `next()` always returns
 * the next unread one regardless of how they were chunked on the wire.
 */

let sharedInterface: Interface | undefined
let lineIterator: AsyncIterator<string> | undefined

async function nextLine(): Promise<string> {
  sharedInterface ??= createInterface({ input: process.stdin })
  lineIterator ??= sharedInterface[Symbol.asyncIterator]()

  const result = await lineIterator.next()

  return result.done ? '' : result.value
}

/** Releases the shared readline interface. Call once a wizard is done prompting. */
export function closePrompts(): void {
  sharedInterface?.close()
  sharedInterface = undefined
  lineIterator = undefined
}

export async function ask(question: string, defaultValue?: string): Promise<string> {
  const hint = defaultValue ? colorize(` (${defaultValue})`, 'gray') : ''
  process.stdout.write(`${colorize('?', 'cyan')} ${question}${hint} `)

  const answer = (await nextLine()).trim()

  return answer || (defaultValue ?? '')
}

export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const hint = colorize(`(${defaultValue ? 'Y/n' : 'y/N'})`, 'gray')
  process.stdout.write(`${colorize('?', 'cyan')} ${question} ${hint} `)

  const answer = (await nextLine()).trim().toLowerCase()

  if (!answer) return defaultValue

  return answer === 'y' || answer === 'yes'
}

export interface SelectOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export async function select<T extends string>(
  question: string,
  options: readonly SelectOption<T>[],
  defaultValue?: T,
): Promise<T> {
  const defaultIndex = Math.max(
    0,
    options.findIndex((option) => option.value === defaultValue),
  )

  console.log(`${colorize('?', 'cyan')} ${question}`)

  options.forEach((option, index) => {
    const marker = index === defaultIndex ? colorize('›', 'green') : ' '
    const hint = option.hint ? colorize(`  ${option.hint}`, 'gray') : ''

    console.log(`  ${marker} ${colorize(`${index + 1})`, 'cyan')} ${option.label}${hint}`)
  })

  for (;;) {
    process.stdout.write(colorize(`  Enter a number (default: ${defaultIndex + 1}) `, 'gray'))

    const raw = (await nextLine()).trim()

    if (!raw) return options[defaultIndex].value

    const index = Number(raw) - 1

    if (Number.isInteger(index) && index >= 0 && index < options.length) return options[index].value

    console.log(colorize(`  Please enter a number between 1 and ${options.length}.`, 'red'))
  }
}
