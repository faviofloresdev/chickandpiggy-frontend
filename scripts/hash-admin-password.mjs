import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'

const password = process.env.ADMIN_PASSWORD
if (!password) throw new Error('Set ADMIN_PASSWORD only for this command')
const salt = randomBytes(16)
const hash = await promisify(scrypt)(password, salt, 64)
process.stdout.write(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}\n`)
