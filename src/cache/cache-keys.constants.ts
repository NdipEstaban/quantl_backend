export const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; //24 hours

export const CacheKeys = {
  // MetaTrader connection
  metatraderConnection: (connectionId: string) => `metatrader_connection_entry:${connectionId}`,

  // All trading accounts (static key)
  allTradingAccounts: () => "all_trading_accounts",

  // Trading account specific
  tradingAccount: (accountId: string) => `trading_account:${accountId}`,

  numberOfTrades: (accountId: string) => `trading_account:${accountId}:number_of_trades`,

  // User specific
  user: (userId: string) => `user:${userId}`,

  userTradingAccounts: (userId: string) => `user:trading_accounts:${userId}`,

  // Wildcard patterns for invalidation
  allUserTradingAccounts: (userId: string) => `user:trading_accounts:${userId}*`,

  allUserData: (userId: string) => `user:${userId}*`,

  allTradingAccountData: (accountId: string) => `trading_account:${accountId}*`,
};

export default CacheKeys;
