// src/mt5/interfaces/position.interface.ts

// Base Position interface
export interface Position {
  connection: string;
  ticket: number;
  time: string;
  time_msc?: string;
  type: "BUY" | "SELL";
  magic: number;
  identifier: number;
  reason: number;
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  swap: number;
  profit: number;
  symbol: string;
  comment: string;
  external_id: string;
  source_connection?: string; // For cross-connection queries
}

// Position with connection info
export interface PositionWithConnection extends Position {
  source_connection: string;
}

// Response for all positions from a specific connection
export interface PositionsResponse {
  connection: string;
  positions: Position[];
  count: number;
}

// Response for all positions across all connections
export interface AllPositionsResponse {
  positions: PositionWithConnection[];
  total_positions: number;
  total_profit: number;
  total_volume: number;
  positions_by_symbol: Record<string, PositionWithConnection[]>;
  connections_with_positions: number;
}

// Response for positions by symbol
export interface PositionsBySymbolResponse {
  symbol: string;
  connection?: string;
  positions: Position[];
  count: number;
}

// Detailed response for positions by symbol across all connections
export interface PositionsBySymbolAllConnections {
  symbol: string;
  positions: PositionWithConnection[];
  total_positions: number;
  total_volume: number;
  total_profit: number;
  buy_positions: number;
  sell_positions: number;
  buy_volume: number;
  sell_volume: number;
  connections: string[];
}

// Position close response
export interface ClosePositionResponse {
  connection: string;
  success: boolean;
  ticket: number;
  position: number;
  price: number;
  volume: number;
  profit: number;
  comment: string;
  retcode: number;
  timestamp: string;
}
