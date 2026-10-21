// Which GoOut account a referral code belongs to. The codes are editable in the
// dashboard's settings (backend `settings.accountReferrals`); these are the fallback
// until they load. Labels only -- the scraper keeps its own codes in its .env.
export type AccountReferrals = { account1: string; account2: string };

export const DEFAULT_ACCOUNT_REFERRALS: AccountReferrals = {
  account1: 'a312e1e1g1',
  account2: 'a3fg911a00',
};

export type ReferralAccount = 'account1' | 'account2' | 'unknown';

export const referralAccount = (code: string | null | undefined, codes: AccountReferrals): ReferralAccount | null => {
  const c = (code || '').trim();
  if (!c) return null;
  if (c === codes.account1) return 'account1';
  if (c === codes.account2) return 'account2';
  return 'unknown';
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
