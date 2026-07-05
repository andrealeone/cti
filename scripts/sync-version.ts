import { $ } from 'bun'

const { version } = (await Bun.file('package.json').json()) as { version: string }

await $`bun install`

console.log(`Synced lockfile for version ${version}`)
