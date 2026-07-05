import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Fetches demo templates straight from GitHub. A compiled `concise-ti` binary
 * has no access to this repo's `/demos` folder (it isn't bundled), so `init`
 * downloads the requested demo's files over the network instead, always from
 * `main` (see docs/guides/cli/project-init.md for why a moving ref is fine here).
 */

const REPO = 'andrealeone/cti'
const REF = 'main'

interface GitTreeEntry {
  path: string
  type: 'blob' | 'tree'
}

interface GitTreeResponse {
  tree: GitTreeEntry[]
  truncated: boolean
}

async function fetchTree(): Promise<GitTreeEntry[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${REF}?recursive=1`
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })

  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${url}`)

  const data = (await response.json()) as GitTreeResponse

  if (data.truncated)
    throw new Error(
      "GitHub's tree listing was truncated; the repo is larger than this tool expects.",
    )

  return data.tree
}

/** Lists every demo name found under `demos/` in the remote repo. */
export async function listDemoNames(): Promise<string[]> {
  const tree = await fetchTree()
  const names = new Set<string>()

  for (const entry of tree) {
    const match = /^demos\/([^/]+)\//.exec(entry.path)
    if (match) names.add(match[1])
  }

  return [...names].sort()
}

interface RemoteFile {
  path: string
  relativePath: string
}

async function listDemoFiles(demo: string): Promise<RemoteFile[]> {
  const tree = await fetchTree()
  const prefix = `demos/${demo}/`

  return tree
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
    .map((entry) => ({ path: entry.path, relativePath: entry.path.slice(prefix.length) }))
}

async function fetchRawFile(path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${path}`
  const response = await fetch(url)

  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`)

  return response.text()
}

/** Downloads every file of `demos/<demo>` into `targetDir`, preserving its internal structure. */
export async function downloadDemo(demo: string, targetDir: string): Promise<string[]> {
  const files = await listDemoFiles(demo)

  if (files.length === 0) throw new Error(`No files found for demo "${demo}".`)

  const written: string[] = []

  for (const file of files) {
    const content = await fetchRawFile(file.path)
    const destination = join(targetDir, file.relativePath)

    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, content)
    written.push(file.relativePath)
  }

  return written
}
