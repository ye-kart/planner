import { nanoid } from 'nanoid';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 8;

export function generateId(): string {
  // Use custom alphabet for CLI-friendly IDs (alphanumeric only)
  let id = '';
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
