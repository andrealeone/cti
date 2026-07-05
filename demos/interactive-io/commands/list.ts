import { command } from 'cti'
import { loadProfiles } from '../lib/storage'

export default command({
  meta: { description: 'List all user profiles' },
  async run(ctx) {
    ctx.logger.info('Fetching all profiles')

    const profiles = await loadProfiles()

    if (profiles.length === 0) {
      ctx.io.write('No profiles found.')
      ctx.logger.info('No profiles in storage')
      return 0
    }

    // Piped output (isTTY === false) skips decoration in favor of a stable,
    // scriptable format: one profile per line, tab-separated.
    if (!ctx.io.isTTY) {
      for (const profile of profiles) {
        ctx.io.write(`${profile.id}\t${profile.name}\t${profile.email}\t${profile.role}`)
      }
      ctx.logger.info(`Listed ${profiles.length} profiles`)
      return 0
    }

    ctx.io.write('')
    ctx.io.write(ctx.io.color('User Profiles', 'cyan'))
    ctx.io.write(ctx.io.color('═'.repeat(80), 'gray'))

    for (const profile of profiles) {
      const roleColor =
        profile.role === 'admin' ? 'red' : profile.role === 'user' ? 'green' : 'yellow'
      const status = ctx.io.color(`[${profile.role.toUpperCase()}]`, roleColor)
      ctx.io.write(
        `${status} ${profile.name.padEnd(20)} ${profile.email.padEnd(30)} (${profile.id})`,
      )
    }

    ctx.io.write(ctx.io.color('═'.repeat(80), 'gray'))
    ctx.io.write(`Total: ${profiles.length} profile(s)`)
    ctx.io.write('')

    ctx.logger.info(`Listed ${profiles.length} profiles`)
  },
})
