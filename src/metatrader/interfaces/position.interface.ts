// src/mt5/interfaces/position.interface.ts
export interface Position {
  ticket: number;
  time: Date;
  type: string;
  volume: number;
  symbol: string;
  price_open: number;
  price_current: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  comment?: string;
  magic: number;
}
