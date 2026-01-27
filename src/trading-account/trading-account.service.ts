import CacheKeys, { DEFAULT_CACHE_TTL } from "@/cache/cache-keys.constants";
import { CacheService } from "@/cache/cache.service";
import { MetatraderService } from "@/metatrader/metatrader.service";
import { PrismaService } from "@/prisma.service";
import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditLogAction,
  OrderSide,
  OrderStatus,
  OrderType,
  TradingAccount,
  TradingPlatform,
} from "@prisma/client";
import { randomUUID } from "crypto";
import * as crypto from "crypto";
import { ConnectionConfigDto } from "@/metatrader/dto/metatrader.dto";
import { ConnectAccountDto, UpdateAccountDto } from "./dtos/trading-account.dto";
import ErrorCodes, { getErrorMessage } from "@/common/error-codes";

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

  async getConnectedAccounts(ipAddress: string, userAgent: string, userId?: string): Promise<any[]> {
    if (userId) {
      const cacheKey = CacheKeys.userTradingAccounts(userId);
      const accounts = await this.cacheService.wrap(
        cacheKey,
        () =>
          this.prisma.tradingAccount.findMany({
            where: {
              userId,
              deleted: false,
            },
            omit: {
              connectionConfig: true,
            },
          }),
        DEFAULT_CACHE_TTL,
      );

      const result = [];
      for (const account of accounts) {
        const logs = await this.prisma.auditLog.findMany({
          where: {
            action: {
              in: [AuditLogAction.ACCOUNT_LINKED, AuditLogAction.TRADE_SYNC],
            },
            userId: account.userId,
            metadata: {
              path: ["tradingAccountId"],
              equals: account.id,
            },
          },
          omit: {
            ipAddress: true,
            userAgent: true,
            deleted: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        result.push({
          ...account,
          logs,
        });
      }
      return result;
    } else {
      const cacheKey = CacheKeys.allTradingAccounts();
      return this.cacheService.wrap(
        cacheKey,
        () =>
          this.prisma.tradingAccount.findMany({
            where: {
              userId,
              deleted: false,
            },
          }),
        DEFAULT_CACHE_TTL,
      );
    }
  }

  async connectTradingAccount(ipAddress: string, userAgent: string, accountInfo: ConnectAccountDto) {
    if (accountInfo.platformId === TradingPlatform.MT5) {
      const credentials = accountInfo.credentials as ConnectionConfigDto;
      return await this.connectMetatraderAccount(ipAddress, userAgent, credentials);
    }
  }

  async connectMetatraderAccount(ipAddress: string, userAgent: string, accountInfo: ConnectionConfigDto) {
    const connectionName = randomUUID();
    accountInfo.name = connectionName;

    // Test the connection
    const testConnection = await this.metatraderService.testConnection(accountInfo);

    // Check if the user entered an investor password
    if (!testConnection?.success) {
      throw new HttpException(ErrorCodes.ACCOUNT_NOT_FOUND.toString(), HttpStatus.BAD_REQUEST);
    }

    if (testConnection.account_info?.is_investor_password == false) {
      throw new Error(ErrorCodes.PROVIDE_INVESTOR_PASSWORD.toString());
    }

    // Create connection
    const createConnection = await this.metatraderService.createConnection(accountInfo);
    if (!createConnection?.success) {
      throw new HttpException(ErrorCodes.INTERNAL_SERVER_ERROR.toString(), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Get account info and create trading account in db
    const accountData = await this.metatraderService.getAccountInfo(connectionName);

    // Encrypt the investor password
    const encryptedPassword = this.encryptPassword(accountInfo.password);

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
      platform: TradingPlatform.MT5.toString(),
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
        isDemo: accountData.is_demo,
        isContest: accountData.is_contest,
        isActive: accountData.terminal_info?.connected || false,
        lastSyncAt: new Date(),
        syncError: null,
        updatedAt: new Date(),
        deleted: false,
      },
      create: {
        platform: TradingPlatform.MT5,
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
        isDemo: accountData.is_demo,
        isContest: accountData.is_contest,
        isActive: accountData.terminal_info?.connected || false,
        lastSyncAt: new Date(),
        syncFrequency: 60,
        userId: accountInfo.userId,
        createdAt: new Date(),
      },
    });

    // Cache the connection name
    await this.cacheService.set(CacheKeys.metatraderConnection(newTradingAccount.id), connectionName);

    //create logs
    await this.prisma.auditLog.create({
      data: {
        userId: newTradingAccount.userId,
        action: AuditLogAction.ACCOUNT_LINKED,
        ipAddress,
        userAgent,
        metadata: {
          platform: newTradingAccount.platform,
          isDemo: newTradingAccount.isDemo,
          isContext: newTradingAccount.isContest,
          brokerName: newTradingAccount.brokerName,
        },
      },
    });
  }

  async disconnectAccount(ipAddress: string, userAgent: string, tradingAccountId: string): Promise<void> {
    const tradingAccount = await this.cacheService.wrap<TradingAccount | null>(
      CacheKeys.tradingAccount(tradingAccountId),
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

  async syncAllAccounts(ipAddress: string, userAgent: string, userId: string): Promise<any> {
    const cacheKey = CacheKeys.userTradingAccounts(userId);
    const tradingAccounts = await this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.tradingAccount.findMany({
          where: {
            userId,
          },
          select: {
            id: true,
          },
        }),
      DEFAULT_CACHE_TTL,
    );

    const syncAccounts = [];

    for (const account of tradingAccounts) {
      syncAccounts.push(this.synchronizeMetatraderAccount(ipAddress, userAgent, account.id));
    }

    const synchedAccounts = await Promise.allSettled(syncAccounts);

    return {
      success: true,
      message: "Account synchronized successfully",
      synchedAccounts,
    };
  }

  async updateAccount(
    ipAddress: string,
    userAgent: string,
    accountId: string,
    data: UpdateAccountDto,
  ): Promise<TradingAccount | void> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({ where: { id: accountId } });

    if (!tradingAccount) {
      throw new NotFoundException(ErrorCodes.ACCOUNT_NOT_FOUND);
    }

    await this.prisma.tradingAccount.update({
      where: {
        id: accountId,
      },
      data,
    });

    await this.cacheService.del(CacheKeys.userTradingAccounts(tradingAccount.userId));
    if (data.syncFrequency) {
      await this.cacheService.del(CacheKeys.tradingAccountBySyncFrequency(data.syncFrequency));
    }
  }

  async synchronizeMetatraderAccount(
    ipAddress: string,
    userAgent: string,
    tradingAccountId: string,
  ): Promise<any> {
    const connectionName = (await this.cacheService.get(
      CacheKeys.metatraderConnection(tradingAccountId),
    )) as string;

    if (connectionName) {
      try {
        //Fetch account info
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
          await Promise.all(dealPromises);
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
          await Promise.all(upsertPromises);
          console.log(`Successfully upserted ${upsertPromises.length} orders`);
        }

        //add logs for number of trades synchronized
        const oldAccountData = await this.prisma.tradingAccount.findUnique({
          where: {
            id: tradingAccountId,
          },
          select: {
            numberOfTrades: true,
            userId: true,
          },
        });
        if (oldAccountData != null && oldAccountData.numberOfTrades) {
          const logsMetaData = {
            success: true,
            tradingAccountId,
            newTrades:
              numberOfTrades > oldAccountData.numberOfTrades
                ? numberOfTrades - oldAccountData.numberOfTrades
                : 0,
          };

          await this.prisma.auditLog.create({
            data: {
              userId: oldAccountData.userId,
              action: AuditLogAction.TRADE_SYNC,
              ipAddress: ipAddress,
              userAgent: userAgent,
              metadata: logsMetaData,
            },
          });
        }

        //update trading account info
        const tradingAccount = await this.prisma.tradingAccount.update({
          where: { id: tradingAccountId },
          data: {
            balance: accountData.balance,
            equity: accountData.equity,
            margin: accountData.margin,
            freeMargin: accountData.free_margin,
            isActive: accountData.terminal_info?.connected || false,
            lastSyncAt: new Date(),
            syncError: null,
            accountName: accountData.name,
            currency: accountData.currency,
            numberOfTrades,
          },
        });

        await this.cacheService.del(CacheKeys.userTradingAccounts(tradingAccount.userId));

        return {
          id: tradingAccountId,
          login: accountData.login,
          name: accountData.name,
          server: accountData.server,
          balance: accountData.balance,
          equity: accountData.equity,
          currency: accountData.currency,
          freeMargin: accountData.free_margin,
          leverage: accountData.leverage,
          numberOfTrades,
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error.response.status);
        const account = await this.prisma.tradingAccount.update({
          where: {
            id: tradingAccountId,
          },
          data: {
            syncError: errorMessage,
          },

          /*
 syncError: {
              response: {
              ~~~~~~~~
                statusCode: 500,
                message: "Error",
                details: undefined
              },
              status: 500,
              options: undefined,
              message: "Error",
              name: "HttpException",
        ?     set?: String | Null
            }
          }
          */
        });

        //create logs
        if (account != null) {
          const logsMetaData = {
            success: false,
            error: errorMessage,
          };

          await this.prisma.auditLog.create({
            data: {
              userId: account.userId,
              action: AuditLogAction.TRADE_SYNC,
              ipAddress: ipAddress,
              userAgent: userAgent,
              metadata: logsMetaData,
            },
          });
        }

        return {
          id: tradingAccountId,
          syncError: error,
        };
      }
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
