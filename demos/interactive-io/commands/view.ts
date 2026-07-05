import { command } from 'concise-ti'
import { loadProfiles } from '../lib/storage'

export default command({
  meta: { description: 'View a user profile' },
  async run(ctx) {
    const userId = ctx.positionals[0]

    if (!userId) {
      ctx.io.writeError('Usage: profiles view <user-id>')
      return 1
    }

    const profiles = await loadProfiles()
    const profile = profiles.find((p) => p.id === userId)

    if (!profile) {
      ctx.logger.warn(`Profile not found: ${userId}`)
      ctx.io.writeError(`Profile not found: ${userId}`)
      return 1
    }

    ctx.logger.info(`Viewing profile: ${profile.id}`)

    ctx.io.write('')
    ctx.io.write(ctx.io.color(`User Profile: ${profile.name}`, 'cyan'))
    ctx.io.write(ctx.io.color('─'.repeat(50), 'gray'))

    ctx.io.write(`${ctx.io.color('ID:', 'blue')}       ${profile.id}`)
    ctx.io.write(`${ctx.io.color('Name:', 'blue')}     ${profile.name}`)
    ctx.io.write(`${ctx.io.color('Email:', 'blue')}    ${profile.email}`)

    const roleColor =
      profile.role === 'admin' ? 'red' : profile.role === 'user' ? 'green' : 'yellow'
    ctx.io.write(`${ctx.io.color('Role:', 'blue')}     ${ctx.io.color(profile.role, roleColor)}`)

    ctx.io.write(`${ctx.io.color('Created:', 'blue')}  ${profile.createdAt}`)
    ctx.io.write('')

    ctx.logger.info(`Successfully displayed profile for ${profile.name}`)
  },
})
