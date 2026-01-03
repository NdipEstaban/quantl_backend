// src/mt5/dto/trade-history.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TradeHistoryDto {
  @IsOptional()
  @IsDateString()
  @IsString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  @IsString()
  to_date?: string;
}

export class TicketParamDto {
  @Type(() => Number)
  ticket: number;
}

export class SymbolParamDto {
  @IsString()
  symbol: string;
}
