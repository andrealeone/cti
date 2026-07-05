import { createInterface, type Interface } from 'node:readline'

/**
 * Real `prompt`/`confirm`/`select`, reading lines through readline's
 * async-iterator protocol rather than repeated `.question()` calls.
 * `.question()` attaches a one-shot 'line' listener, so if several answers
 * arrive in a single stdin chunk (always true for piped/scripted input —
 * tests, CI, shell pipelines), every line past the first is emitted with no
 * listener attached and silently lost. The async iterator queues emitted
 * lines instead, so `next()` always returns the next unread one regardless
 * of how they were chunked on the wire.
 */

let sharedInterface: Interface | undefined
let lineIterator: AsyncIterator<string> | undefined

async function nextLine(): Promise<string> {
  sharedInterface ??= createInterface({ input: process.stdin })
  lineIterator ??= sharedInterface[Symbol.asyncIterator]()

  const result = await lineIterator.next()

  return result.done ? '' : result.value
}

/**
 * Releases the shared readline interface. `run()` calls this after every
 * command, whether or not it touched a prompt: once these read from a real
 * interface instead of resolving instantly, leaving it open would keep the
 * process alive (holding a listener on stdin) after dispatch is done.
 */
export function closePrompts(): void {
  sharedInterface?.close()
  sharedInterface = undefined
  lineIterator = undefined
}

export async function prompt(question: string): Promise<string> {
  process.stdout.write(`${question} `)

  return (await nextLine()).trim()
}

export async function confirm(question: string, fallback = false): Promise<boolean> {
  process.stdout.write(`${question} (${fallback ? 'Y/n' : 'y/N'}) `)

  const answer = (await nextLine()).trim().toLowerCase()

  if (!answer) return fallback

  return answer === 'y' || answer === 'yes'
}

export async function select<T extends string>(question: string, choices: readonly T[]): Promise<T> {
  console.log(question)
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}) ${choice}`)
  })

  for (;;) {
    process.stdout.write(`Enter a number (default: 1) `)

    const raw = (await nextLine()).trim()

    if (!raw) return choices[0]

    const index = Number(raw) - 1

    if (Number.isInteger(index) && index >= 0 && index < choices.length) return choices[index]

    console.log(`Please enter a number between 1 and ${choices.length}.`)
  }
}
