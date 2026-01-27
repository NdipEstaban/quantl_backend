import CacheKeys, { DEFAULT_CACHE_TTL } from "@/cache/cache-keys.constants";
import { CacheService } from "@/cache/cache.service";
import { PrismaService } from "@/prisma.service";
import { TradingAccountService } from "@/trading-account/trading-account.service";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class SyncTradingAccounts {
  private readonly logger = new Logger(SyncTradingAccounts.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly tradingAccountService: TradingAccountService,
    private readonly prisma: PrismaService,
  ) {}

  /*
   * * * * * *
   | | | | | |
   | | | | | day of week (0-7, 0 and 7 are Sunday)
   | | | | months (1-12)
   | | | day of month (1-31)
   | | hours (0-23)
   | minutes (0-59)
   seconds (0-59, optional)
  */

  // Every 5 minutes
  @Cron("0 */5 * * * *", {
    name: "sync-5min",
  })
  async handleEvery5Minutes() {
    const frequency = 5 * 60; // 5 minutes in seconds
    await this.syncAccounts(frequency, "5 minutes");
  }

  // Every 15 minutes
  @Cron("0 */15 * * * *", {
    name: "sync-15min",
  })
  async handleEvery15Minutes() {
    const frequency = 15 * 60; // 15 minutes in seconds - FIXED
    await this.syncAccounts(frequency, "15 minutes");
  }

  // Every 30 minutes
  @Cron("0 */30 * * * *", {
    name: "sync-30min",
  })
  async handleEvery30Minutes() {
    const frequency = 30 * 60; // 30 minutes in seconds - FIXED
    await this.syncAccounts(frequency, "30 minutes");
  }

  // Every 1 hour
  @Cron("0 0 * * * *", {
    name: "sync-1hour",
  })
  async handleEvery1Hour() {
    const frequency = 60 * 60; // 1 hour in seconds - FIXED
    await this.syncAccounts(frequency, "1 hour");
  }

  // Every 4 hours
  @Cron("0 0 */4 * * *", {
    name: "sync-4hours",
  })
  async handleEvery4Hours() {
    const frequency = 4 * 60 * 60; // 4 hours in seconds - FIXED
    await this.syncAccounts(frequency, "4 hours");
  }

  // Every day at midnight
  @Cron("0 0 0 * * *", {
    name: "sync-daily",
  })
  async handleEveryDay() {
    const frequency = 24 * 60 * 60; // 1 day in seconds - FIXED
    await this.syncAccounts(frequency, "1 day");
  }

  // Helper function with error handling and logging
  async syncAccounts(frequency: number, intervalName: string) {
    const startTime = Date.now();
    this.logger.log(`🔄 Starting ${intervalName} sync (frequency: ${frequency}s)`);

    try {
      // Fetch trading accounts with the specific sync frequency
      const tradingAccounts = await this.cacheService.wrap(
        CacheKeys.tradingAccountBySyncFrequency(frequency),
        async () =>
          await this.prisma.tradingAccount.findMany({
            where: {
              syncFrequency: frequency,
            },
            select: {
              id: true,
              accountNumber: true, // Added for better logging
            },
          }),
        DEFAULT_CACHE_TTL,
      );

      if (tradingAccounts.length === 0) {
        this.logger.log(`✅ ${intervalName} sync completed - No accounts with frequency ${frequency}s`);
        return;
      }

      this.logger.log(`📊 Found ${tradingAccounts.length} accounts to sync for ${intervalName}`);

      // Sync all accounts with individual error handling
      const results = await Promise.allSettled(
        tradingAccounts.map(async (account) => {
          try {
            await this.tradingAccountService.synchronizeMetatraderAccount("", "", account.id);
            return { success: true, accountId: account.id };
          } catch (error) {
            this.logger.error(`❌ Failed to sync account ${account.id}:`, error.message);
            return { success: false, accountId: account.id, error };
          }
        }),
      );

      // Count successes and failures
      const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
      const failed = results.length - successful;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (failed > 0) {
        this.logger.warn(
          `⚠️ ${intervalName} sync completed with errors: ${successful} successful, ${failed} failed (${duration}s)`,
        );
      } else {
        this.logger.log(
          `✅ ${intervalName} sync completed: ${successful} accounts synced successfully (${duration}s)`,
        );
      }
    } catch (error) {
      this.logger.error(`💥 ${intervalName} sync failed catastrophically:`, error.stack);
    }
  }
}
