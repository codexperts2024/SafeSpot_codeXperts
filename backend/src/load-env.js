import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '../..')

export const loadEnvironment = () => {
  dotenv.config({ path: path.join(workspaceRoot, '.env'), quiet: true })
}
