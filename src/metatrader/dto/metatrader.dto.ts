// src/metatrader/dto/trade-history.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min, Max, IsNotEmpty } from "class-validator";
import { OrderType } from "../interfaces/trade.interface";

export class TradeHistoryDto {
  @ApiPropertyOptional({ description: "Number of days to look back" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class TicketParamDto {
  @ApiProperty({ description: "Position ticket number" })
  @IsNumber()
  ticket: number;
}

export class SymbolParamDto {
  @ApiProperty({ description: "Trading symbol (e.g., EURUSD)" })
  @IsString()
  symbol: string;
}

export class ConnectionNameQueryDto {
  @ApiPropertyOptional({ description: "Connection name" })
  @IsOptional()
  @IsString()
  connection_name?: string;
}

export class PlaceOrderDto {
  @ApiProperty({ description: "Trading symbol" })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: ["BUY", "SELL", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"] })
  @IsString()
  order_type: OrderType;

  @ApiProperty({ description: "Volume to trade" })
  @IsNumber()
  @Min(0.01)
  volume: number;

  @ApiPropertyOptional({ description: "Price" })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "Stop loss" })
  @IsOptional()
  @IsNumber()
  sl?: number;

  @ApiPropertyOptional({ description: "Take profit" })
  @IsOptional()
  @IsNumber()
  tp?: number;

  @ApiPropertyOptional({ description: "Connection name" })
  @IsOptional()
  @IsString()
  connection_name?: string;
}

export class ConnectionConfigDto {
  @ApiProperty({ description: "Unique name for the connection" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "MT5 account number" })
  @IsNumber()
  login: number;

  @ApiProperty({ description: "MT5 account password" })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: "MT5 server name" })
  @IsString()
  @IsNotEmpty()
  server: string;

  @ApiPropertyOptional({ description: "Path to MT5 terminal executable" })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: "Connection timeout in milliseconds", default: 10000 })
  @IsOptional()
  @IsNumber()
  timeout?: number = 10000;

  @ApiPropertyOptional({ description: "Use portable mode", default: false })
  @IsOptional()
  @IsBoolean()
  portable?: boolean = false;
}

export class UpdateConnectionDto {
  @ApiPropertyOptional({ description: "New connection name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "MT5 account number" })
  @IsOptional()
  @IsNumber()
  login?: number;

  @ApiPropertyOptional({ description: "MT5 account password" })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: "MT5 server name" })
  @IsOptional()
  @IsString()
  server?: string;

  @ApiPropertyOptional({ description: "Path to MT5 terminal executable" })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: "Connection timeout in milliseconds" })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: "Use portable mode" })
  @IsOptional()
  @IsBoolean()
  portable?: boolean;
}

export class BulkConnectDto {
  @ApiProperty({ type: [String], description: "List of connection names" })
  @IsArray()
  @IsString({ each: true })
  names: string[];
}

export class ImportConnectionsDto {
  @ApiProperty({ type: [ConnectionConfigDto], description: "List of connections to import" })
  @IsArray()
  connections: ConnectionConfigDto[];

  @ApiPropertyOptional({ description: "Automatically connect after import", default: true })
  @IsOptional()
  @IsBoolean()
  auto_connect?: boolean = true;
}
