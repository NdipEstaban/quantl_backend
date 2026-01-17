// src/trade-account/trade-account.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UseFilters,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from "@nestjs/swagger";
import { ConnectionConfigDto } from "@/metatrader/dto/metatrader.dto";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { User } from "@prisma/client";
import { TradingAccountService } from "./trading-account.service";

@ApiTags("Trading Accounts")
@Controller("trade-accounts")
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradeAccountController {
  constructor(private readonly tradeAccountService: TradingAccountService) {}

  // ============ Account Listing & Retrieval ============
  @Get("connected")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all connected trading accounts for authenticated user",
    description: "Retrieves all active trading accounts connected to the user",
  })
  @ApiResponse({
    status: 200,
    description: "List of connected trading accounts retrieved successfully",
  })
  async getConnectedAccounts(user: User) {
    return this.tradeAccountService.getConnectedAccounts(user.id);
  }

  // ============ Account Connection Management ============
  @Post("connect/mt5")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Connect a new MetaTrader 5 account",
    description: "Tests connection, validates investor password, and creates a new trading account",
  })
  @ApiBody({ type: ConnectionConfigDto })
  @ApiResponse({
    status: 201,
    description: "MT5 account connected successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid connection parameters or investor password required",
  })
  async connectMetatraderAccount(@Body() connectionConfig: ConnectionConfigDto) {
    // Add userId from authenticated user to the connection config
    const accountInfo = {
      ...connectionConfig,
    };

    return this.tradeAccountService.connectMetatraderAccount(accountInfo);
  }

  @Delete(":accountId/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Disconnect a trading account",
    description: "Soft deletes a trading account (marks as deleted)",
  })
  @ApiParam({
    name: "accountId",
    description: "Trading account ID",
  })
  @ApiResponse({
    status: 200,
    description: "Account disconnected successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  async disconnectAccount(@Param("accountId") tradingAccountId: string) {
    return this.tradeAccountService.disconnectAccount(tradingAccountId);
  }

  // ============ Account Synchronization ============
  @Post("sync/all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Synchronize all user trading accounts",
    description: "Syncs account data and trade history for all connected accounts",
  })
  @ApiResponse({
    status: 200,
    description: "All accounts synchronized successfully",
  })
  async syncAllAccounts(userId: string) {
    return this.tradeAccountService.syncAllAccounts(userId);
  }

  @Post(":accountId/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Synchronize specific trading account",
    description: "Syncs account data, orders, and deals for a specific trading account",
  })
  @ApiParam({
    name: "accountId",
    description: "Trading account ID",
  })
  @ApiResponse({
    status: 200,
    description: "Account synchronized successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  async synchronizeMetatraderAccount(@Param("accountId") tradingAccountId: string) {
    return this.tradeAccountService.synchronizeMetatraderAccount(tradingAccountId);
  }

  // ============ Account Update ============
  @Put(":accountId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update trading account configuration",
    description: "Updates connection settings and account information",
  })
  @ApiParam({
    name: "accountId",
    description: "Trading account ID",
  })
  @ApiBody({
    description: "Account update data",
    schema: {
      type: "object",
      properties: {
        server: { type: "string", description: "MT5 server address" },
        password: { type: "string", description: "New investor password" },
        syncFrequency: { type: "number", description: "Sync frequency in seconds" },
        accountName: { type: "string", description: "Custom account name" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Account updated successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Failed to update MT5 connection",
  })
  async updateAccount(@Param("accountId") accountId: string, @Body() updates: any) {
    return this.tradeAccountService.updateAccount(accountId, updates);
  }
}
