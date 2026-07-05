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
  tag = prerelease ? prerelease[1] : 'latest'

console.log(
  `\nChecks passed. Publish ${name}@${version} with dist-tag "${tag}" by running (with your OTP):\n\n  npm publish --tag ${tag} --otp=<code>${dryRun ? ' --dry-run' : ''}\n`,
)

if (!dryRun) {
  await $`git tag v${version}`
  await $`git push`
  await $`git push --tags`

  await $`gh release create v${version} --title v${version} --generate-notes ${
    prerelease ? '--prerelease' : ''
  }`
}
