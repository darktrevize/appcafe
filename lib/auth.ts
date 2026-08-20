// Single shared-password gate for the whole app. Runs in both the Node
// runtime (Server Actions) and the Edge runtime (middleware), so it only
// uses the Web Crypto API (available in both) instead of Node's `crypto`.

export const AUTH_COOKIE_NAME = 'app_session';

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// The cookie stores a hash derived from the app password, not the password
// itself, so the plaintext password never has to round-trip through the
// browser after login.
export async function getExpectedSessionValue(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? '';
  return sha256Hex(`appcafe-session:${password}`);
}

export async function isValidSessionValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await getExpectedSessionValue();
  return value === expected;
}
