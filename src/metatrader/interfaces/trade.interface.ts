// src/mt5/interfaces/trade.interface.ts
export interface TradeBase {
  ticket: number;
  symbol: string;
  volume: number;
  price: number;
  profit: number;
}

export interface Deal extends TradeBase {
  order: number;
  time: Date;
  type: number;
  entry: number;
  swap: number;
  commission: number;
  comment?: string;
  magic: number;
}

export interface Order {
  ticket: number;
  time_setup: Date;
  time_done?: Date;
  type: number;
  state: number;
  volume_initial: number;
  volume_current: number;
  symbol: string;
  price_open: number;
  price_current: number;
  sl: number;
  tp: number;
  comment?: string;
  magic: number;
}

export interface TradeHistoryResponse {
  deals: Deal[];
  orders: Order[];
  total_deals: number;
  total_orders: number;
  from_date: Date;
  to_date: Date;
}
