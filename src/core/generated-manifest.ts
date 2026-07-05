import type { Manifest } from '@/types/manifest'

/**
 * Placeholder, overwritten by `concise-ti compile` right before it invokes
 * `bun build --compile`, and restored afterward. `run()` only ever imports
 * this inside a compiled binary (see `isCompiledBinaryDir` in runtime.ts);
 * `bun run` always discovers commands live, regardless of this file's
 * contents.
 */
export const generated = false

const manifest: Manifest = { entries: [] }

export default manifest
