import { join } from 'node:path'
import { homedir } from 'node:os'
import type { BunFile } from 'bun'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  createdAt: string
}

export const PROFILES_FILE = join(homedir(), '.concise-ti-profiles.json')

export async function loadProfiles(): Promise<UserProfile[]> {
  try {
    const file: BunFile = Bun.file(PROFILES_FILE),
      exists = await file.exists()

    if (!exists) return []

    return JSON.parse(await file.text()) as UserProfile[]
  } catch {
    return []
  }
}

export async function saveProfiles(profiles: UserProfile[]): Promise<void> {
  await Bun.write(PROFILES_FILE, JSON.stringify(profiles, null, 2))
}

export function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
