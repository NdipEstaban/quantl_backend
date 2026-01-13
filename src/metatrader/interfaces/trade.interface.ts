// src/mt5/interfaces/trade.interface.ts

import { Position } from "@prisma/client";
import { AccountInfo, AllAccountsSummary, AllConnectionsStatus } from "./account.interface";

export enum OrderType {
  BUY = "BUY",
  SELL = "SELL",
  BUY_LIMIT = "BUY_LIMIT",
  SELL_LIMIT = "SELL_LIMIT",
  BUY_STOP = "BUY_STOP",
  SELL_STOP = "SELL_STOP",
}

// Deal interface
export interface Deal {
  connection: string;
  ticket: number;
  order: number;
  time: string;
  type: number;
  entry: number;
  magic: number;
  reason: number;
  position_id: number;
  volume: number;
  price: number;
  commission: number;
  swap: number;
  profit: number;
  fee: number;
  symbol: string;
  comment: string;
  external_id: string;
}

// Order interface
export interface Order {
  connection: string;
  ticket: number;
  time_setup: string;
  time_setup_msc?: string;
  time_done?: string;
  time_done_msc?: string;
  type: number;
  type_filling: number;
  type_time: number;
  state: number;
  magic: number;
  reason: number;
  position_id: number;
  position_by_id: number;
  volume_initial: number;
  volume_current: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  price_stoplimit: number;
  symbol: string;
  comment: string;
  external_id: string;
}

// Trade history response
export interface TradeHistoryResponse {
  connection: string;
  deals: Deal[];
  orders: Order[];
  total_deals: number;
  total_orders: number;
  total_profit: number;
  total_volume: number;
  from_date: string;
  to_date: string;
}

// Current state response
export interface CurrentStateResponse {
  connection: string;
  account: AccountInfo; // From account.interface.ts
  positions: Position[]; // From position.interface.ts
  timestamp: string;
}

// Place order request
export interface PlaceOrderRequest {
  symbol: string;
  order_type: OrderType;
  volume: number;
  price?: number;
  sl?: number;
  tp?: number;
  deviation?: number;
  magic?: number;
  comment?: string;
  connection_name?: string;
}

// Place order response
export interface PlaceOrderResponse {
  connection: string;
  success: boolean;
  ticket: number;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  comment: string;
  request_id: number;
  retcode: number;
  timestamp: string;
}

// Symbol information
export interface SymbolInfo {
  connection: string;
  symbol: string;
  description: string;
  path: string;
  currency_base: string;
  currency_profit: string;
  currency_margin: string;
  trade_calculation_mode: number;
  trade_mode: number;
  trade_stops_level: number;
  trade_freeze_level: number;
  trade_exemode: number;
  swap_mode: number;
  swap_long: number;
  swap_short: number;
  margin_initial: number;
  margin_maintenance: number;
  volume_min: number;
  volume_max: number;
  volume_step: number;
  volume_limit: number;
  spread: number;
  spread_float: boolean;
  ticks_bookdepth: number;
  trade_tick_size: number;
  trade_tick_value: number;
  trade_contract_size: number;
  trade_date_last?: string;
  trade_time: number;
  trade_time_msc: number;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  time?: string;
  flags: number;
  visible: boolean;
  session_deals: number;
  session_buy_orders: number;
  session_sell_orders: number;
  session_turnover: number;
  session_interest: number;
  session_avg_price: number;
}

// Available symbols response
export interface AvailableSymbolsResponse {
  connection: string;
  symbols: string[];
  count: number;
}

// Health check interfaces
export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface MT5HealthCheckResponse {
  status: "ok" | "partial";
  connections: {
    total: number;
    connected: number;
    disconnected: number;
  };
  details: AllConnectionsStatus; // From account.interface.ts
}

export interface FullHealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    mt5_service: boolean;
    account_service: boolean;
    api: boolean;
  };
  mt5: MT5HealthCheckResponse;
  accounts: AllAccountsSummary; // From account.interface.ts
}

// Server info for connection creation
export interface ServerInfo {
  name: string;
  description: string;
}

// Bulk operations response
export interface BulkOperationResult {
  name: string;
  success: boolean;
  error?: string;
  [key: string]: any;
}

export interface BulkOperationResponse {
  results: BulkOperationResult[];
  total: number;
  successful: number;
  failed: number;
}

// Import/Export interfaces
export interface ExportedConnection {
  name: string;
  login: number;
  password: string;
  server: string;
  path?: string;
  timeout: number;
  portable: boolean;
}

export interface ExportConnectionsResponse {
  connections: ExportedConnection[];
  count: number;
  exported_at: string;
  warning: string;
}
