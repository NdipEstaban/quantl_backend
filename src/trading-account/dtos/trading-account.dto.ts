// src/trade-account/dtos/update-account.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TradingPlatform } from "@prisma/client";
import { IsOptional, IsString, IsNumber, Min, IsNotEmpty } from "class-validator";

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: "Sync frequency in seconds (minimum 30)",
    example: 60,
    minimum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  syncFrequency?: number;

  @ApiPropertyOptional({
    description: "Sync frequency in seconds (minimum 30)",
    example: 60,
    minimum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  autoSync?: boolean;

  @ApiPropertyOptional({
    description: "Whether the account is active for syncing",
    example: true,
  })
  @IsOptional()
  isActive?: boolean;
}

// Add if you need a response DTO
export class TradingAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  accountIdentifier: string;

  @ApiProperty()
  brokerName: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  equity: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  isDemo: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastSyncAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class SyncResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  tradingAccountId: string;

  @ApiProperty()
  connectionName: string;

  @ApiProperty()
  accountInfo: {
    login: number;
    name: string;
    server: string;
    balance: number;
    equity: number;
    currency: string;
    freeMargin: number;
    leverage: number;
    numberOfTrades: number;
  };
}

export class ConnectAccountDto {
  @ApiProperty({ description: "User unique id" })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: "Unique Id of the trading platform" })
  @IsString()
  @IsNotEmpty()
  platformId: string;

  @ApiProperty({ description: "Nickname of the account" })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: "Credentials for connection" })
  @IsNotEmpty()
  credentials: Record<string, any>;
}

// Helper type for specific platform credentials (for type safety in your backend)
export interface MT5Credentials {
  login: string;
  password: string;
  server: string;
}

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface IBKRCredentials {
  username: string;
  accountType: "live" | "paper";
}

export interface CTraderCredentials {
  clientId: string;
  clientSecret: string;
}

export interface TradingViewCredentials {
  webhookUrl?: string; // Generated on backend
}
