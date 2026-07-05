import { command } from 'concise-ti'
import { loadProfiles, saveProfiles, generateId } from '../lib/storage'

const ROLES = ['admin', 'user', 'viewer'] as const

export default command({
  meta: { description: 'Create a new user profile (interactive)' },
  async run(ctx) {
    ctx.logger.info('Starting interactive profile creation')

    const name = await ctx.io.prompt('User name: ')
    if (!name.trim()) {
      ctx.logger.warn('Profile creation cancelled: no name provided')
      ctx.io.writeError('Name cannot be empty')
      return 1
    }

    const email = await ctx.io.prompt('Email address: ')
    if (!email.trim()) {
      ctx.logger.warn('Profile creation cancelled: no email provided')
      ctx.io.writeError('Email cannot be empty')
      return 1
    }

    ctx.logger.debug(`Selected role will be chosen from: ${ROLES.join(', ')}`)
    const role = await ctx.io.select('Select role:', ROLES)
    ctx.logger.info(`User selected role: ${role}`)

    // Show a summary before confirming
    ctx.io.write('')
    ctx.io.write('Summary:')
    ctx.io.write(`  Name:  ${name}`)
    ctx.io.write(`  Email: ${email}`)
    ctx.io.write(`  Role:  ${role}`)
    ctx.io.write('')

    const confirm = await ctx.io.confirm('Create this profile?', false)
    if (!confirm) {
      ctx.logger.info('Profile creation cancelled by user')
      ctx.io.write('Profile creation cancelled.')
      return 0
    }

    const profiles = await loadProfiles()
    const existingEmail = profiles.find((p) => p.email === email)
    if (existingEmail) {
      ctx.logger.warn(`Profile creation rejected: email already exists: ${email}`)
      ctx.io.writeError(`Email already exists: ${email}`)
      return 1
    }

    const newProfile = {
      id: generateId(),
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    }

    profiles.push(newProfile)
    await saveProfiles(profiles)

    ctx.logger.info(`Profile created successfully: ${newProfile.id}`)
    ctx.io.write(`✓ Profile created: ${newProfile.id}`)
  },
})
