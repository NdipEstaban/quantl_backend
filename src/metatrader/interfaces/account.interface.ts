// src/mt5/interfaces/account.interface.ts

// Base Account Info from MT5
export interface AccountInfo {
  connection: string;
  login: number;
  name: string;
  company: string;
  server: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level: number;
  margin_call_level: number;
  margin_stopout_level: number;
  profit: number;
  currency: string;
  leverage: number;
  trade_allowed: boolean;
  trade_expert: boolean;
  terminal_info?: {
    connected: boolean;
    build: number;
    max_bars: number;
  };
  timestamp: string;
  is_demo: boolean;
  is_contest: boolean;
}

// Account summary with additional metrics
export interface AccountSummary extends AccountInfo {
  open_positions: number;
  total_floating_pl: number;
}

// Summary for all accounts
export interface AllAccountsSummary {
  accounts: AccountSummary[];
  total_accounts: number;
  total_balance: number;
  total_equity: number;
  total_open_positions: number;
}

// Connection status
export interface ConnectionStatus {
  name: string;
  login: number;
  server: string;
  status: string;
  connected: boolean;
  account_info?: {
    balance?: number;
    equity?: number;
    currency?: string;
  };
  timestamp: string;
}

// For multiple connections status
export interface AllConnectionsStatus {
  connections: ConnectionStatus[];
  total: number;
  connected: number;
  disconnected: number;
}

// Connection configuration for creating/updating connections
export interface ConnectionConfig {
  name: string;
  login: number;
  password: string;
  server: string;
  userId: string;
  path?: string;
  timeout?: number;
  portable?: boolean;
}

// Connection test result
export interface ConnectionTestResult {
  name: string;
  success: boolean;
  message: string;
  connection_time_ms?: number;
  account_info?: {
    login: number;
    balance: number;
    equity: number;
    currency: string;
    server: string;
    company: string;
    is_investor_password: boolean;
    trade_allowed: boolean;
  };
}

// Connection statistics
export interface ConnectionStats {
  total_connections: number;
  connected: number;
  disconnected: number;
  connection_rate: number;
  default_connection?: string;
  timestamp: string;
}

// Connection detailed info
export interface ConnectionInfo {
  name: string;
  login: number;
  server: string;
  path?: string;
  timeout: number;
  portable: boolean;
  status: string;
  connected: boolean;
  is_default: boolean;
  account_info?: {
    balance: number;
    equity: number;
    currency: string;
    leverage: number;
  };
  created_at: string;
  last_active?: string;
}

// Response wrapper for API calls
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}
