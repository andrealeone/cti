import { command } from 'concise-ti'
import { loadProfiles, saveProfiles, generateId } from '../lib/storage'

interface ImportRecord {
  name: string
  email: string
  role?: 'admin' | 'user' | 'viewer'
}

export default command({
  meta: { description: 'Import user profiles from JSON on stdin' },
  async run(ctx) {
    ctx.logger.info('Starting profile import from stdin')

    let input: string
    try {
      input = await Bun.stdin.text()
    } catch {
      ctx.logger.error('Failed to read from stdin')
      ctx.io.writeError('Failed to read from stdin')
      return 1
    }

    if (!input.trim()) {
      ctx.logger.warn('Import failed: no input provided')
      ctx.io.writeError('No input provided')
      return 1
    }

    let records: ImportRecord[]
    try {
      records = JSON.parse(input)
      if (!Array.isArray(records)) {
        throw new Error('Input must be a JSON array')
      }
    } catch (error) {
      ctx.logger.error(
        `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      )
      ctx.io.writeError(
        `Error parsing JSON: ${error instanceof Error ? error.message : String(error)}`,
      )
      return 1
    }

    const spinner = ctx.io.spinner(`Importing ${records.length} profiles...`)

    try {
      const profiles = await loadProfiles()
      const imported: string[] = []

      for (const record of records) {
        if (!record.name || !record.email) {
          ctx.logger.warn(`Skipping invalid record: missing name or email`)
          continue
        }

        const exists = profiles.find((p) => p.email === record.email)
        if (exists) {
          ctx.logger.warn(`Skipping duplicate email: ${record.email}`)
          continue
        }

        const newProfile = {
          id: generateId(),
          name: record.name,
          email: record.email,
          role: record.role ?? 'user',
          createdAt: new Date().toISOString(),
        }

        ctx.logger.info(`Imported profile: ${newProfile.email} as ${newProfile.role}`)
        profiles.push(newProfile)
        imported.push(newProfile.id)
      }

      await saveProfiles(profiles)
      spinner.succeed(`✓ Imported ${imported.length} profile(s)`)
      ctx.logger.info(`Import completed: ${imported.length} profiles saved`)
    } catch (error) {
      spinner.fail(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
      ctx.logger.error(`Import error: ${error instanceof Error ? error.message : String(error)}`)
      return 1
    }
  },
})
