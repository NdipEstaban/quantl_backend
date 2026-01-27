export const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; //24 hours

export const CacheKeys = {
  // MetaTrader connection
  metatraderConnection: (connectionId: string) => `metatrader_connection_entry:${connectionId}`,

  // All trading accounts (static key)
  allTradingAccounts: () => "all_trading_accounts",

  // Trading account specific
  tradingAccount: (accountId: string) => `trading_account:${accountId}`,
  numberOfTrades: (accountId: string) => `trading_account:${accountId}:number_of_trades`,
  tradingAccountBySyncFrequency: (syncInterval: number) => `trading_account:sync_interval:${syncInterval}`,

  // User specific
  user: (userId: string) => `user:${userId}`,
  userTradingAccounts: (userId: string) => `user:${userId}:trading_accounts`,
  oAuth: (provider: string, providerAccountId: string) => `user:oauth:${provider}:${providerAccountId}`,
  verificationAttempts: (userId: string) => `user:${userId}:verificationAttempts`,
  verificationCode: (userId: string) => `user:${userId}:verificationCode`,
  passwordResetCode: (userId: string) => `user:${userId}:passwordResetCode`,
  passwordAttempts: (userId: string) => `user:${userId}:passwordAttempts`,
  verifiedResetCode: (userId: string, code: string) => `user:${userId}:verifiedResetCode:${code}`,

  // Wildcard patterns for invalidation
  allUserTradingAccounts: (userId: string) => `user:${userId}:trading_accounts*`,
  allUserData: (userId: string) => `user:${userId}*`,
  allTradingAccountData: (accountId: string) => `trading_account:${accountId}*`,
  allTradingAccountBySyncFrequency: () => `trading_account:sync_interval:*`,
};

export default CacheKeys;
