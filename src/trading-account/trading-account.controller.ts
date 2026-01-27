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
  Query,
  Patch,
  Ip,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from "@nestjs/swagger";
import { ConnectionConfigDto } from "@/metatrader/dto/metatrader.dto";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { User } from "@prisma/client";
import { TradingAccountService } from "./trading-account.service";
import { InvalidateCache } from "@/cache/cache.decorator";
import { CacheKey } from "@nestjs/cache-manager";
import CacheKeys from "@/cache/cache-keys.constants";
import { CacheService } from "@/cache/cache.service";
import { ConnectionConfig } from "@/metatrader/interfaces/account.interface";
import { ConnectAccountDto } from "./dtos/trading-account.dto";

@ApiTags("Trading Accounts")
@Controller("trade-accounts")
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
//@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradeAccountController {
  constructor(
    private readonly tradeAccountService: TradingAccountService,
    private readonly cacheService: CacheService,
  ) {}

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
  async getConnectedAccounts(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("userId") userId?: string,
  ) {
    return this.tradeAccountService.getConnectedAccounts(ipAddress, userAgent, userId);
  }

  // ============ Account Connection Management ============
  @Post("connect")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Connect a new trading account",
    description: "Connects a new trading account depending on the platform",
  })
  @ApiBody({ type: ConnectAccountDto })
  @ApiResponse({
    status: 201,
    description: "MT5 account connected successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid connection parameters or investor password required",
  })
  async connectNewAccount(
    @Body() connectionConfig: ConnectAccountDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.tradeAccountService.connectTradingAccount(ipAddress, userAgent, connectionConfig);
  }

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
  @InvalidateCache((connectionConfig: ConnectionConfig) => [
    CacheKeys.allUserTradingAccounts(connectionConfig.userId),
  ])
  async connectMetatraderAccount(
    @Body() connectionConfig: ConnectionConfigDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    // Add userId from authenticated user to the connection config
    const accountInfo = {
      ...connectionConfig,
    };

    return this.tradeAccountService.connectMetatraderAccount(ipAddress, userAgent, accountInfo);
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
  async disconnectAccount(
    @Param("accountId") tradingAccountId: string,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.tradeAccountService.disconnectAccount(ipAddress, userAgent, tradingAccountId);
  }

  // ============ Account Synchronization ============
  @Post("sync-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Synchronize all user trading accounts",
    description: "Syncs account data and trade history for all connected accounts",
  })
  @ApiResponse({
    status: 200,
    description: "All accounts synchronized successfully",
  })
  async syncAllAccounts(
    @Query("userId") userId: string,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.tradeAccountService.syncAllAccounts(ipAddress, userAgent, userId);
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
  @InvalidateCache((tradingAccountId: string) => [CacheKeys.allTradingAccountData(tradingAccountId)])
  async synchronizeMetatraderAccount(
    @Param("accountId") tradingAccountId: string,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.tradeAccountService.synchronizeMetatraderAccount(ipAddress, userAgent, tradingAccountId);
  }

  // ============ Account Update ============
  @Patch(":accountId")
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
  @InvalidateCache((accountId: string) => [CacheKeys.allTradingAccountData(accountId)])
  async updateAccount(
    @Param("accountId") accountId: string,
    @Body() updates: any,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.tradeAccountService.updateAccount(ipAddress, userAgent, accountId, updates);
  }
}
