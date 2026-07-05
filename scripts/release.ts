import { $ } from 'bun'

const dryRun = process.argv.includes('--dry-run')

const status = (await $`git status --porcelain`.text()).trim()
if (status) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.')
  process.exit(1)
}

const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()
if (branch !== 'main') {
  console.error(`Releases must be cut from main, not ${branch}.`)
  process.exit(1)
}

await $`bun run check:types`
await $`bun run lint`
await $`bun test`

const { version } = (await Bun.file('package.json').json()) as { version: string }
const prerelease = version.match(/-([a-zA-Z]+)\.\d+$/)
const tag = prerelease ? prerelease[1] : 'latest'

console.log(`Publishing cti@${version} with dist-tag "${tag}"${dryRun ? ' (dry run)' : ''}`)
await $`npm publish --tag ${tag} ${dryRun ? '--dry-run' : ''}`

if (!dryRun) {
  await $`git tag v${version}`
  await $`git push`
  await $`git push --tags`
}
