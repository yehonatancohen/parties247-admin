// Which GoOut account a referral code belongs to. Mirrors GOOUT_ACCOUNT{1,2}_REFERRAL
// in goout-scraper's .env -- update both together if an account's code ever changes.
const REFERRAL_ACCOUNTS: Record<string, 'account1' | 'account2'> = {
  a312e1e1g1: 'account1',
  a3fg911a00: 'account2',
};

export type ReferralAccount = 'account1' | 'account2' | 'unknown';

export const referralAccount = (code?: string | null): ReferralAccount | null => {
  const c = (code || '').trim();
  if (!c) return null;
  return REFERRAL_ACCOUNTS[c] ?? 'unknown';
};

/** The `ref` query param of a ticket link, if any. */
export const referralFromUrl = (url?: string | null): string => {
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('ref') || '';
  } catch {
    return '';
  }
};
