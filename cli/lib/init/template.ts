import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { version } from '../../../package.json' with { type: 'json' }
import { downloadDemo } from './github'
import {
  createPackageJson,
  renderPackageJson,
  withCliScript,
  withDependency,
  withFixedBuildScript,
  withName,
  type PackageJson,
} from './package-json'

export type TemplateMode = 'new' | 'current'

/** Downloads `demo` into a temp dir, then copies it into `targetDir`. When
 * `mode` is `'current'`, the template's own `package.json`/`readme.md` are
 * skipped: an existing project's `package.json` is patched, not replaced. */
export async function applyTemplate(
  demo: string,
  targetDir: string,
  mode: TemplateMode,
): Promise<string[]> {
  const tmp = mkdtempSync(join(tmpdir(), 'concise-ti-init-'))

  try {
    const files = await downloadDemo(demo, tmp),
      skip = new Set(mode === 'current' ? ['package.json', 'readme.md'] : [])

    for (const relativePath of files) {
      if (skip.has(relativePath.toLowerCase())) continue

      const destination = join(targetDir, relativePath)

      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(join(tmp, relativePath), destination)
    }

    return files
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

/** Ensures `targetDir/package.json` has the project name, a `cli` script, the
 * `concise-ti` dependency, and a working `build` script — creating the file
 * if it doesn't exist yet, patching it in place otherwise. */
export function applyPackageJson(targetDir: string, projectName: string): void {
  const pkgPath = join(targetDir, 'package.json')

  let pkg: PackageJson = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson)
    : createPackageJson(projectName)

  pkg = withName(pkg, projectName)
  pkg = withCliScript(pkg)
  pkg = withDependency(pkg, 'concise-ti', `^${version}`)
  pkg = withFixedBuildScript(pkg)

  writeFileSync(pkgPath, renderPackageJson(pkg))
}

export function isEmptyDir(dir: string): boolean {
  return !existsSync(dir) || readdirSync(dir).length === 0
}
