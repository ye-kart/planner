// GitHub usernames are case-insensitive; email local-parts are case-sensitive per
// RFC 5321 but treated case-insensitively by every major provider. Lowercasing on
// both write and read sides avoids byte-level mismatches in the allowlist lookup.
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}
