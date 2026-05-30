import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(backendRoot, '..')

export const loadEnvironment = () => {
  for (const envPath of [
    path.join(backendRoot, '.env'),
    path.join(workspaceRoot, '.env')
  ]) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true })
    }
  }
}
