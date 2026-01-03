// src/mt5/interfaces/account.interface.ts
export interface AccountInfo {
  login: number;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level?: number;
  profit: number;
  currency: string;
  leverage: number;
  server: string;
  company: string;
}

export interface AccountSummary extends AccountInfo {
  open_positions: number;
  total_floating_pl: number;
}
