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

async function runQuiet(label: string, command: ReturnType<typeof $>) {
  console.log(`Running ${label}...`)

  const result = await command.quiet().nothrow()

  if (result.exitCode !== 0) {
    console.error(result.stderr.toString())
    process.exit(result.exitCode)
  }
}

await runQuiet('type check', $`bun check:types`)
await runQuiet('lint', $`bun lint`)
await runQuiet('tests', $`bun test`)

const { name, version } = (await Bun.file('package.json').json()) as {
  name: string
  version: string
}

const prerelease = version.match(/-([a-zA-Z]+)\.\d+$/),
  yellow = (text: string) => `\x1b[33m${text}\x1b[0m`,
  pkg = yellow(`${name}@${version}`)

const registryCheck = await $`npm view ${name}@${version} version`.quiet().nothrow(),
  publishedOnNpm = registryCheck.exitCode === 0,
  gitTagExists = (await $`git tag -l v${version}`.text()).trim().length > 0

if (publishedOnNpm) console.warn(`\n${pkg} is already published on npm. Skipping publish step.`)
else console.log(`\nPublish ${pkg}:\n\n  npm publish --tag latest\n`)

if (gitTagExists) {
  console.warn(`Git tag v${version} already exists. Skipping tag/release steps.\n\n`)
} else if (!dryRun) {
  await $`git tag v${version}`
  await $`git push`
  await $`git push --tags`

  await $`gh release create v${version} --title v${version} --generate-notes ${
    prerelease ? '--prerelease' : ''
  }`
}
