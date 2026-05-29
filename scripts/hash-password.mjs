import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}
const iterations = 210_000;
const salt = randomBytes(16).toString('base64url');
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
console.log(`pbkdf2$${iterations}$${salt}$${hash}`);
