import { auth } from './firebase';

/**
 * Emails that bypass weekly plan + voice generation quotas.
 * Add more addresses here as needed — do not hardcode at call sites.
 */
export const TEST_ACCOUNTS = ['test@reflo.com'] as const;

export function isTestAccountEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return (TEST_ACCOUNTS as readonly string[]).includes(normalized);
}

/** True when the signed-in Firebase user is on the test-account list. */
export function isCurrentUserTestAccount(): boolean {
  return isTestAccountEmail(auth.currentUser?.email);
}
