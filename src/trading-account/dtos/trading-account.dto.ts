// src/trade-account/dtos/update-account.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, Min } from "class-validator";

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: "MT5 server address",
    example: "MetaQuotes-Demo",
  })
  @IsOptional()
  @IsString()
  server?: string;

  @ApiPropertyOptional({
    description: "Investor password for the account",
    example: "password123",
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: "Custom account name",
    example: "My Trading Account",
  })
  @IsOptional()
  @IsString()
  accountName?: string;

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
