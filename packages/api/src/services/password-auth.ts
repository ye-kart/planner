import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
export function isValidEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function validatePassword(password: string): string | undefined {
  if (password.length < 12) return 'Password must be at least 12 characters';
  if (password.length > 1024) return 'Password is too long';
  return undefined;
}
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, expected] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
export function createToken(): string { return randomBytes(32).toString('base64url'); }
export function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export async function sendResendEmail(input: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.PLANNER_RESEND_API_KEY;
  const from = process.env.PLANNER_EMAIL_FROM;
  if (!apiKey || !from) return false;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }) });
  return response.ok;
}
