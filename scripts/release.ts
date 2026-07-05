import { $ } from 'bun'

const dryRun = process.argv.includes('--dry-run'),
  status = (await $`git status --porcelain`.text()).trim()

if (status) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.')
  process.exit(1)
}

const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()

if (branch !== 'main') {
  console.error(`Releases must be cut from main, not ${branch}.`)
  process.exit(1)
}

await $`bun check:types`
await $`bun lint`
await $`bun test`

const { name, version } = (await Bun.file('package.json').json()) as {
  name: string
  version: string
}

const prerelease = version.match(/-([a-zA-Z]+)\.\d+$/),
  tag = prerelease ? prerelease[1] : 'latest'

console.log(`Publishing ${name}@${version} with dist-tag "${tag}"${dryRun ? ' (dry run)' : ''}`)

await $`npm publish --tag ${tag} ${dryRun ? '--dry-run' : ''}`

if (!dryRun) {
  await $`git tag v${version}`
  await $`git push`
  await $`git push --tags`

  await $`gh release create v${version} --title v${version} --generate-notes ${
    prerelease ? '--prerelease' : ''
  }`
}
