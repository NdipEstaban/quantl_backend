import {
  ALL_TRADING_ACCOUNTS_ENTRY,
  DEFAULT_CACHE_TTL,
  METATRADER_CONNECTION_ENTRY,
  TRADING_ACCOUNT_ENTRY,
  USER_TRADING_ACCOUNTS_ENTRY,
} from "@/cache/cache-keys.constants";
import { CacheService } from "@/cache/cache.service";
import { MetatraderService } from "@/metatrader/metatrader.service";
import { PrismaService } from "@/prisma.service";
import { Injectable } from "@nestjs/common";
import { OrderSide, OrderStatus, OrderType, TradingAccount } from "@prisma/client";
import { randomUUID } from "crypto";
import * as crypto from "crypto";
import { ConnectionConfigDto } from "@/metatrader/dto/metatrader.dto";
import { UpdateAccountDto } from "./dtos/trading-account.dto";
import cleanObject from "@/common/clean-objects";

@Injectable()
export class TradingAccountService {
  // Encryption configuration
  private readonly ENCRYPTION_KEY = crypto
    .createHash("sha256")
    .update(process.env.PASSWORD_ENCRYPTION_KEY || "fallback-secret-at-least-32-chars")
    .digest(); // This ALWAYS returns a 32-byte Buffer
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;

  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
    private metatraderService: MetatraderService,
  ) {}

  async getConnectedAccounts(userId?: string): Promise<TradingAccount[]> {
    if (userId) {
      const cacheKey = USER_TRADING_ACCOUNTS_ENTRY + userId;
      return this.cacheService.wrap(
        cacheKey,
        () =>
          this.prisma.tradingAccount.findMany({
            where: {
              userId,
              deleted: false,
            },
          }),
        24 * 60 * 60 * 1000, //24hours
      );
    } else {
      const cacheKey = ALL_TRADING_ACCOUNTS_ENTRY;
      return this.cacheService.wrap(
        cacheKey,
        () =>
          this.prisma.tradingAccount.findMany({
            where: {
              userId,
              deleted: false,
            },
          }),
        24 * 60 * 60 * 1000, //24hours
      );
    }
  }

  async connectMetatraderAccount(accountInfo: ConnectionConfigDto) {
    const connectionName = randomUUID();
    accountInfo.name = connectionName;

    // Test the connection
    const testConnection = await this.metatraderService.testConnection(accountInfo);

    // Check if the user entered an investor password
    if (!testConnection?.success) {
      throw new Error("Failed to connect to MT5 account");
    }

    if (testConnection.account_info?.is_investor_password == false) {
      throw new Error("Please provide an investor password to connect the account");
    }

    // Create connection
    const createConnection = await this.metatraderService.createConnection(accountInfo);
    if (!createConnection?.success) {
      throw new Error("Failed to create MT5 connection");
    }

    // Get account info and create trading account in db
    const accountData = await this.metatraderService.getAccountInfo(connectionName);

    // Encrypt the investor password
    const encryptedPassword = this.encryptPassword(accountInfo.password);

    // Determine if this is a demo account
    const isDemo =
      accountData.server.toLowerCase().includes("demo") || accountData.name.toLowerCase().includes("demo");

    // Extract broker name
    const brokerName = accountData.company || accountData.server.split(".")[0] || "Unknown Broker";

    // Prepare connection config with encrypted password
    const connectionConfig = {
      server: accountData.server,
      serverAddress: accountData.server,
      login: accountData.login,
      encryptedPassword: encryptedPassword,
      passwordEncryptedAt: new Date().toISOString(),
      encryptionAlgorithm: this.ALGORITHM,
      platform: "MT5",
      lastConnected: new Date().toISOString(),
    };

    // Create or update trading account in db
    const newTradingAccount = await this.prisma.tradingAccount.upsert({
      where: {
        userId_platform_accountIdentifier: {
          userId: accountInfo.userId,
          platform: "MT5",
          accountIdentifier: accountData.login.toString(),
        },
      },
      update: {
        brokerName: brokerName,
        accountName: accountData.name || `MT5 Account ${accountData.login}`,
        connectionConfig: connectionConfig,
        balance: accountData.balance,
        equity: accountData.equity,
        margin: accountData.margin,
        freeMargin: accountData.free_margin,
        currency: accountData.currency || "USD",
        leverage: accountData.leverage ? parseInt(accountData.leverage.toString()) : null,
        isDemo: isDemo,
        isPaperTrade: isDemo,
        isActive: accountData.terminal_info?.connected || false,
        lastSyncAt: new Date(),
        syncError: null,
        updatedAt: new Date(),
        deleted: false,
      },
      create: {
        platform: "MT5",
        accountIdentifier: accountData.login.toString(),
        brokerName: brokerName,
        accountName: accountData.name || `MT5 Account ${accountData.login}`,
        connectionConfig: connectionConfig,
        balance: accountData.balance,
        equity: accountData.equity,
        margin: accountData.margin,
        freeMargin: accountData.free_margin,
        currency: accountData.currency || "USD",
        leverage: accountData.leverage ? parseInt(accountData.leverage.toString()) : null,
        isDemo: isDemo,
        isPaperTrade: isDemo,
        isActive: accountData.terminal_info?.connected || false,
        lastSyncAt: new Date(),
        syncFrequency: 60,
        userId: accountInfo.userId,
        createdAt: new Date(),
      },
    });

    // Cache the connection name
    await this.cacheService.set(METATRADER_CONNECTION_ENTRY + newTradingAccount.id, connectionName);
  }

  async disconnectAccount(tradingAccountId: string): Promise<void> {
    const tradingAccount = await this.cacheService.wrap<TradingAccount | null>(
      TRADING_ACCOUNT_ENTRY + tradingAccountId,
      () => this.prisma.tradingAccount.findUnique({ where: { id: tradingAccountId } }),
      DEFAULT_CACHE_TTL,
    );

    if (tradingAccount) {
      await this.prisma.tradingAccount.update({
        where: { id: tradingAccountId },
        data: { deleted: true },
      });
    }
  }

  async syncAllAccounts(userId: string): Promise<any> {
    const tradingAccounts = await this.prisma.tradingAccount.findMany({
      where: {
        userId,
      },
    });

    const syncAccounts = [];

    for (const account of tradingAccounts) {
      syncAccounts.push(this.synchronizeMetatraderAccount(account.id));
    }

    const synchedAccounts = await Promise.all(syncAccounts);

    return {
      success: true,
      message: "Account synchronized successfully",
      synchedAccounts,
    };
  }

  async updateAccount(accountId: string, data: UpdateAccountDto): Promise<TradingAccount | void> {
    const tradingAccount = await this.cacheService.wrap<TradingAccount | null>(
      TRADING_ACCOUNT_ENTRY + accountId,
      () => this.prisma.tradingAccount.findUnique({ where: { id: accountId } }),
      DEFAULT_CACHE_TTL,
    );
    if (!tradingAccount) {
      throw new Error("Trading account not found");
    }

    const connectionName = (await this.cacheService.get(METATRADER_CONNECTION_ENTRY + accountId)) as string;
    const existingConnection = await this.metatraderService.getConnection(connectionName);

    if (existingConnection) {
      const updateConnection = await this.metatraderService.updateConnection(connectionName, {
        name: connectionName,
        ...cleanObject({
          server: data.server,
          login: data.accountNumber,
          password: data.password,
        }),
      });

      if (!updateConnection?.success) {
        throw new Error("Failed to update MT5 connection");
      }

      const connectionConfig = cleanObject({
        server: data.server,
        serverAddress: data.server,
        login: data.accountNumber,
        encryptedPassword: data.password ? this.encryptPassword(data.password) : undefined,
        passwordEncryptedAt: data.password ? new Date().toISOString() : undefined,
        encryptionAlgorithm: data.password ? this.ALGORITHM : undefined,
        platform: "MT5",
        lastConnected: new Date().toISOString(),
      });

      return await this.prisma.tradingAccount.update({
        where: { id: accountId },
        data: cleanObject({
          accountName: data.accountName,
          syncFrequency: data.syncFrequency,
          isActive: data.isActive,
          connectionConfig,
        }),
      });
    }
  }

  async synchronizeMetatraderAccount(tradingAccountId: string): Promise<any> {
    const connectionName = (await this.cacheService.get(
      METATRADER_CONNECTION_ENTRY + tradingAccountId,
    )) as string;

    if (connectionName) {
      const accountData = await this.metatraderService.getAccountInfo(connectionName);

      // Fetch trade history (deals and orders) for the last 30 days
      const tradeHistory = await this.metatraderService.getTradeHistory(30, connectionName);
      let numberOfTrades = 0;
      if (tradeHistory && tradeHistory.deals) {
        // Store trades in db
        const dealPromises = tradeHistory.deals.map(async (deal) => {
          // Determine entry type from MT5 entry field
          let entryType = null;

          if (deal.entry === 0) entryType = "IN";
          else if (deal.entry === 1) entryType = "OUT";
          else if (deal.entry === 2) entryType = "IN_OUT";

          if (entryType != "IN") numberOfTrades++;

          await this.prisma.deal.upsert({
            where: {
              tradingAccountId_externalId: {
                tradingAccountId,
                externalId: deal.ticket.toString(),
              },
            },

            update: {
              // values that can change over time
              profit: deal.profit,
              swap: deal.swap,
              commission: deal.commission,
              fee: deal.fee,
              comment: deal.comment,
              updatedAt: new Date(),
            },

            create: {
              tradingAccountId,

              // identity
              externalId: deal.ticket.toString(),
              orderExternalId: deal.order ? deal.order.toString() : null,
              positionExternalId: deal.position_id ? deal.position_id.toString() : null,

              // trade data
              symbol: deal.symbol,
              volume: deal.volume,
              price: deal.price,
              profit: deal.profit,
              time: new Date(deal.time),
              side: deal.type === 1 ? "LONG" : "SHORT",
              entryType: entryType,
              // fees
              swap: deal.swap ?? 0,
              commission: deal.commission ?? 0,
              fee: deal.fee ?? 0,

              // misc
              comment: deal.comment,

              platformData: {
                ticket: deal.ticket,
                mt5ExternalId: deal.external_id,
                magic: deal.magic,
                reason: deal.reason,
                type: deal.type,
                entry: deal.entry,
              },
            },
          });
        });

        // Execute all promises in parallel
        try {
          await Promise.all(dealPromises);
          console.log(`Successfully upserted ${dealPromises.length} deals`);
        } catch (error) {
          console.error("Error upserting deals:", error);
          throw error;
        }
      }

      if (tradeHistory && tradeHistory.orders) {
        // Create an array of upsert promises
        const upsertPromises = tradeHistory.orders.map(async (order) => {
          // Map MT5 order type to your OrderType enum
          const orderTypeMap: Record<number, OrderType> = {
            0: "MARKET", // ORDER_TYPE_BUY
            1: "MARKET", // ORDER_TYPE_SELL
            2: "LIMIT", // ORDER_TYPE_BUY_LIMIT
            3: "LIMIT", // ORDER_TYPE_SELL_LIMIT
            4: "STOP", // ORDER_TYPE_BUY_STOP
            5: "STOP", // ORDER_TYPE_SELL_STOP
            6: "STOP_LIMIT", // ORDER_TYPE_BUY_STOP_LIMIT
            7: "STOP_LIMIT", // ORDER_TYPE_SELL_STOP_LIMIT
          };

          const orderStatusMap: Record<number, OrderStatus> = {
            0: "OPEN",
            1: "OPEN",
            2: "CANCELED",
            3: "PARTIALLY_FILLED",
            4: "FILLED",
            5: "REJECTED",
            6: "EXPIRED",
          };

          const side: OrderSide = [0, 2, 4, 6].includes(order.type) ? "LONG" : "SHORT";
          const volumeFilled = order.volume_initial - (order.volume_current || 0);

          return this.prisma.order.upsert({
            where: {
              tradingAccountId_externalId: {
                tradingAccountId,
                externalId: String(order.ticket),
              },
            },
            create: {
              externalId: String(order.ticket),
              tradingAccountId,
              symbol: order.symbol,
              side: side,
              orderType: orderTypeMap[order.type] || "MARKET",
              status: orderStatusMap[order.state] || "PENDING",
              volumeInitial: order.volume_initial,
              volumeFilled: volumeFilled,
              priceOrder: order.price_open || null,
              priceFilled: order.price_current || null,
              stopLoss: order.sl || 0,
              takeProfit: order.tp || 0,
              timeCreated: new Date(order.time_setup),
              timeFilled: order.time_done ? new Date(order.time_done) : null,
              timeExpiry: null,
              comment: order.comment || null,
              platformData: {
                ticket: order.ticket,
                type: order.type,
                type_filling: order.type_filling,
                type_time: order.type_time,
                state: order.state,
                magic: order.magic,
                reason: order.reason,
                position_id: order.position_id,
                position_by_id: order.position_by_id,
                price_stoplimit: order.price_stoplimit,
                external_id: order.external_id,
                time_setup_msc: order.time_setup_msc,
                time_done_msc: order.time_done_msc,
              },
            },
            update: {
              symbol: order.symbol,
              side: side,
              orderType: orderTypeMap[order.type] || "MARKET",
              status: orderStatusMap[order.state] || "PENDING",
              volumeInitial: order.volume_initial,
              volumeFilled: volumeFilled,
              priceOrder: order.price_open || null,
              priceFilled: order.price_current || null,
              stopLoss: order.sl || 0,
              takeProfit: order.tp || 0,
              timeFilled: order.time_done ? new Date(order.time_done) : null,
              comment: order.comment || null,
              platformData: {
                ticket: order.ticket,
                type: order.type,
                type_filling: order.type_filling,
                type_time: order.type_time,
                state: order.state,
                magic: order.magic,
                reason: order.reason,
                position_id: order.position_id,
                position_by_id: order.position_by_id,
                price_stoplimit: order.price_stoplimit,
                external_id: order.external_id,
                time_setup_msc: order.time_setup_msc,
                time_done_msc: order.time_done_msc,
              },
            },
          });
        });

        // Execute all upserts in parallel
        try {
          await Promise.all(upsertPromises);
          console.log(`Successfully upserted ${upsertPromises.length} orders`);
        } catch (error) {
          console.error("Error upserting orders:", error);
          throw error;
        }
      }

      return {
        success: true,
        message: "Account synchronized successfully",
        tradingAccountId: tradingAccountId,
        connectionName: connectionName,
        accountInfo: {
          login: accountData.login,
          name: accountData.name,
          server: accountData.server,
          balance: accountData.balance,
          equity: accountData.equity,
          currency: accountData.currency,
          freeMargin: accountData.free_margin,
          leverage: accountData.leverage,
          numberOfTrades,
        },
      };
    }
  }

  private encryptPassword(plainPassword: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(plainPassword, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  }

  private decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted password format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
