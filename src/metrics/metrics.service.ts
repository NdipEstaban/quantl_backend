import { PrismaService } from "@/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "luxon";
import {
  AdvancedMetrics,
  ConsistencyMetrics,
  DailyProfit,
  DailyTradeStats,
  EquityGrowthPoint,
  HoldingTimeAnalysis,
  ProfitDistribution,
  SessionMetrics,
  StreakAnalysis,
  TradeFrequency,
  Vitals,
} from "./interface";

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get vital trading metrics for an account
   * Only deals with DEAL_ENTRY_OUT represent closed positions with realized profit/loss
   */
  async getVitals(accountId: string, startDate?: DateTime, endDate?: DateTime): Promise<Vitals> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    // Get all deals (only OUT deals represent closed trades with P&L)
    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        ...(startDate && endDate
          ? {
              time: {
                gte: startDate.toJSDate(),
                lte: endDate.toJSDate(),
              },
            }
          : {}),
        // Filter for OUT deals which represent closed positions
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        averageRiskToReward: 0,
        netProfit: 0,
        percentageDrawdown: 0,
        averageWin: 0,
        averageLoss: 0,
      };
    }

    // Separate winning and losing trades
    const wins = deals.filter((d) => d.profit > 0);
    const losses = deals.filter((d) => d.profit < 0);

    // Calculate win rate
    const winRate = (wins.length / deals.length) * 100;

    // Calculate total wins and losses
    const totalWins = wins.reduce((sum, d) => sum + d.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, d) => sum + d.profit, 0));

    // Calculate profit factor
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate average win and loss
    const averageWin = wins.length > 0 ? totalWins / wins.length : 0;
    const averageLoss = losses.length > 0 ? totalLosses / losses.length : 0;

    // Calculate average risk to reward
    const averageRiskToReward = averageLoss > 0 ? averageWin / averageLoss : 0;

    // Calculate net profit (including fees and commissions)
    const netProfit = deals.reduce((sum, d) => sum + d.profit + d.swap + d.commission + d.fee, 0);

    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningEquity = 0;

    for (const deal of deals) {
      runningEquity += deal.profit + deal.swap + deal.commission + deal.fee;
      if (runningEquity > peak) {
        peak = runningEquity;
      }
      const drawdown = peak - runningEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const percentageDrawdown = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    return {
      winRate,
      profitFactor,
      averageRiskToReward,
      netProfit,
      percentageDrawdown,
      averageWin,
      averageLoss,
    };
  }

  /**
   * Get equity growth over time
   * Returns monthly equity or adapts to the date range provided
   */
  async getEquityGrowth(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<EquityGrowthPoint[]> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    let queryStartDate: DateTime;
    let queryEndDate: DateTime;

    if (startDate && endDate) {
      queryStartDate = startDate;
      queryEndDate = endDate;
    } else {
      // Default to last 12 months
      queryEndDate = DateTime.now();
      queryStartDate = queryEndDate.minus({ months: 12 });
    }

    // Get all OUT deals which represent closed positions
    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return [];
    }

    // Determine the best grouping based on date range
    const daysDiff = queryEndDate.diff(queryStartDate, "days").days;
    let groupFormat: string;

    if (daysDiff <= 31) {
      // Daily for up to a month
      groupFormat = "yyyy-MM-dd";
    } else if (daysDiff <= 365) {
      // Weekly for up to a year
      groupFormat = "yyyy-WW"; // ISO week
    } else {
      // Monthly for more than a year
      groupFormat = "yyyy-MM";
    }

    // Group deals by period
    const periodData = new Map<string, number>();
    let cumulativeEquity = 0;

    for (const deal of deals) {
      const dealTime = DateTime.fromJSDate(deal.time);
      const periodKey = dealTime.toFormat(groupFormat);
      cumulativeEquity += deal.profit + deal.swap + deal.commission + deal.fee;

      periodData.set(periodKey, cumulativeEquity);
    }

    // Convert to array and sort
    const result: EquityGrowthPoint[] = Array.from(periodData.entries())
      .map(([period, equity]) => ({ period, equity }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return result;
  }

  /**
   * Get daily trade statistics for a specific month
   */
  async getDailyTradesForMonth(accountId: string, year: number, month: number): Promise<DailyTradeStats[]> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const startDate = DateTime.fromObject({ year, month, day: 1 }).startOf("day");
    const endDate = startDate.endOf("month");

    // Get OUT deals for the month
    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: startDate.toJSDate(),
          lte: endDate.toJSDate(),
        },
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    // Group by day
    const dailyStats = new Map<string, { count: number; profitLoss: number }>();

    for (const deal of deals) {
      const dateKey = DateTime.fromJSDate(deal.time).toFormat("yyyy-MM-dd");

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, { count: 0, profitLoss: 0 });
      }

      const stats = dailyStats.get(dateKey)!;
      stats.count++;
      stats.profitLoss += deal.profit + deal.swap + deal.commission + deal.fee;
    }

    // Convert to array
    const result: DailyTradeStats[] = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        tradeCount: stats.count,
        profitLoss: stats.profitLoss,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  /**
   * Get advanced performance metrics
   */
  async getAdvancedMetrics(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<AdvancedMetrics> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ years: 1 });
    const queryEndDate = endDate || DateTime.now();

    // Get OUT deals
    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return {
        expectancy: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
      };
    }

    // Calculate returns (profit including all costs)
    const returns = deals.map((d) => d.profit + d.swap + d.commission + d.fee);
    const totalReturn = returns.reduce((sum, r) => sum + r, 0);

    // Expectancy (average profit per trade)
    const expectancy = totalReturn / returns.length;

    // Calculate average return
    const avgReturn = expectancy;

    // Sharpe Ratio (risk-adjusted return, assuming risk-free rate = 0)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Sortino Ratio (downside deviation only)
    const negativeReturns = returns.filter((r) => r < avgReturn);
    const downsideVariance =
      negativeReturns.length > 0
        ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / negativeReturns.length
        : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;

    // Calmar Ratio (return / max drawdown)
    let peak = 0;
    let maxDrawdown = 0;
    let runningEquity = 0;

    for (const returnVal of returns) {
      runningEquity += returnVal;
      if (runningEquity > peak) {
        peak = runningEquity;
      }
      const drawdown = peak - runningEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const calmarRatio = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;

    return {
      expectancy,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
    };
  }

  /**
   * Get profit by day of week
   */
  async getProfitByDayOfWeek(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<DailyProfit[]> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
    });

    const weekdayTotals = new Map<string, number>([
      ["Monday", 0],
      ["Tuesday", 0],
      ["Wednesday", 0],
      ["Thursday", 0],
      ["Friday", 0],
      ["Saturday", 0],
      ["Sunday", 0],
    ]);

    for (const deal of deals) {
      const dealTime = DateTime.fromJSDate(deal.time);
      const dayName = dealTime.weekdayLong; // Monday, Tuesday, etc.
      const totalProfit = deal.profit + deal.swap + deal.commission + deal.fee;

      if (dayName) {
        weekdayTotals.set(dayName, weekdayTotals.get(dayName)! + totalProfit);
      }
    }

    return Array.from(weekdayTotals.entries()).map(([day, profit]) => ({
      day,
      profit,
    }));
  }

  /**
   * Get session-based trading metrics
   * Sessions are based on New York time:
   * - Asian: 19:00-03:00 (7 PM to 3 AM)
   * - London: 03:00-08:00 (3 AM to 8 AM)
   * - New York: 08:00-17:00 (8 AM to 5 PM)
   */
  async getSessionMetrics(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<SessionMetrics[]> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
    });

    if (deals.length === 0) {
      return [
        { session: "Asian", trades: 0, winRate: 0, percentageOfTotal: 0 },
        { session: "London", trades: 0, winRate: 0, percentageOfTotal: 0 },
        { session: "New York", trades: 0, winRate: 0, percentageOfTotal: 0 },
      ];
    }

    const sessionData = {
      Asian: { deals: [] as typeof deals, wins: 0 },
      London: { deals: [] as typeof deals, wins: 0 },
      "New York": { deals: [] as typeof deals, wins: 0 },
    };

    for (const deal of deals) {
      // Parse the time directly in New York timezone (no conversion)
      const nyTime = DateTime.fromJSDate(deal.time, {
        zone: "America/New_York",
      });
      const hour = nyTime.hour;

      let session: "Asian" | "London" | "New York";

      if (hour >= 3 && hour < 8) {
        session = "London";
      } else if (hour >= 8 && hour < 17) {
        session = "New York";
      } else {
        // Asian: 19:00-03:00 (7 PM to 3 AM)
        session = "Asian";
      }

      sessionData[session].deals.push(deal);

      // Count winning trades
      const totalProfit = deal.profit + deal.swap + deal.commission + deal.fee;
      if (totalProfit > 0) {
        sessionData[session].wins++;
      }
    }

    const totalTrades = deals.length;

    return [
      {
        session: "Asian",
        trades: sessionData.Asian.deals.length,
        winRate:
          sessionData.Asian.deals.length > 0
            ? (sessionData.Asian.wins / sessionData.Asian.deals.length) * 100
            : 0,
        percentageOfTotal: (sessionData.Asian.deals.length / totalTrades) * 100,
      },
      {
        session: "London",
        trades: sessionData.London.deals.length,
        winRate:
          sessionData.London.deals.length > 0
            ? (sessionData.London.wins / sessionData.London.deals.length) * 100
            : 0,
        percentageOfTotal: (sessionData.London.deals.length / totalTrades) * 100,
      },
      {
        session: "New York",
        trades: sessionData["New York"].deals.length,
        winRate:
          sessionData["New York"].deals.length > 0
            ? (sessionData["New York"].wins / sessionData["New York"].deals.length) * 100
            : 0,
        percentageOfTotal: (sessionData["New York"].deals.length / totalTrades) * 100,
      },
    ];
  }

  /**
   * Get streak analysis showing winning/losing streaks
   */
  async getStreakAnalysis(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<StreakAnalysis> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return {
        maxWinningStreak: 0,
        maxLosingStreak: 0,
        currentStreak: 0,
        currentStreakType: "none",
        averageWinningStreak: 0,
        averageLosingStreak: 0,
      };
    }

    let maxWinningStreak = 0;
    let maxLosingStreak = 0;
    let currentStreak = 0;
    let currentStreakType: "winning" | "losing" | "none" = "none";

    const winningStreaks: number[] = [];
    const losingStreaks: number[] = [];

    let tempWinStreak = 0;
    let tempLoseStreak = 0;

    for (const deal of deals) {
      const totalProfit = deal.profit + deal.swap + deal.commission + deal.fee;
      const isWin = totalProfit > 0;

      if (isWin) {
        tempWinStreak++;
        if (tempLoseStreak > 0) {
          losingStreaks.push(tempLoseStreak);
          tempLoseStreak = 0;
        }
        maxWinningStreak = Math.max(maxWinningStreak, tempWinStreak);
      } else {
        tempLoseStreak++;
        if (tempWinStreak > 0) {
          winningStreaks.push(tempWinStreak);
          tempWinStreak = 0;
        }
        maxLosingStreak = Math.max(maxLosingStreak, tempLoseStreak);
      }
    }

    // Handle the last streak
    if (tempWinStreak > 0) {
      winningStreaks.push(tempWinStreak);
      currentStreak = tempWinStreak;
      currentStreakType = "winning";
    } else if (tempLoseStreak > 0) {
      losingStreaks.push(tempLoseStreak);
      currentStreak = tempLoseStreak;
      currentStreakType = "losing";
    }

    const averageWinningStreak =
      winningStreaks.length > 0 ? winningStreaks.reduce((a, b) => a + b, 0) / winningStreaks.length : 0;

    const averageLosingStreak =
      losingStreaks.length > 0 ? losingStreaks.reduce((a, b) => a + b, 0) / losingStreaks.length : 0;

    return {
      maxWinningStreak,
      maxLosingStreak,
      currentStreak,
      currentStreakType,
      averageWinningStreak,
      averageLosingStreak,
    };
  }

  /**
   * Get trade frequency analysis
   */
  async getTradeFrequency(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<TradeFrequency> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
    });

    if (deals.length === 0) {
      return {
        averageTradesPerDay: 0,
        totalTradingDays: 0,
        totalTrades: 0,
        busiestDay: "",
        busiestDayTrades: 0,
        slowestDay: "",
        slowestDayTrades: 0,
      };
    }

    // Group trades by date
    const dailyTrades = new Map<string, number>();

    for (const deal of deals) {
      const dateKey = DateTime.fromJSDate(deal.time).toFormat("yyyy-MM-dd");
      dailyTrades.set(dateKey, (dailyTrades.get(dateKey) || 0) + 1);
    }

    const totalTradingDays = dailyTrades.size;
    const totalTrades = deals.length;
    const averageTradesPerDay = totalTrades / totalTradingDays;

    // Find busiest and slowest days
    let busiestDay = "";
    let busiestDayTrades = 0;
    let slowestDay = "";
    let slowestDayTrades = Infinity;

    for (const [date, count] of dailyTrades.entries()) {
      if (count > busiestDayTrades) {
        busiestDayTrades = count;
        busiestDay = date;
      }
      if (count < slowestDayTrades) {
        slowestDayTrades = count;
        slowestDay = date;
      }
    }

    return {
      averageTradesPerDay,
      totalTradingDays,
      totalTrades,
      busiestDay,
      busiestDayTrades,
      slowestDay,
      slowestDayTrades: slowestDayTrades === Infinity ? 0 : slowestDayTrades,
    };
  }

  /**
   * Get holding time analysis
   * Analyzes how long positions are held before being closed
   */
  async getHoldingTimeAnalysis(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<HoldingTimeAnalysis> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    // Get all deals (both IN and OUT) to calculate holding times
    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return {
        averageHoldingTimeMinutes: 0,
        shortestTradeMinutes: 0,
        longestTradeMinutes: 0,
        averageWinningTradeMinutes: 0,
        averageLosingTradeMinutes: 0,
      };
    }

    // Group deals by position ID to calculate holding times
    const positionTimes = new Map<string, { entryTime: Date; exitTime: Date; profit: number }>();

    for (const deal of deals) {
      const positionId = deal.positionExternalId;
      if (!positionId) continue;

      if (deal.entryType === "IN") {
        // Entry deal
        if (!positionTimes.has(positionId)) {
          positionTimes.set(positionId, {
            entryTime: deal.time,
            exitTime: deal.time,
            profit: 0,
          });
        } else {
          const pos = positionTimes.get(positionId)!;
          pos.entryTime = deal.time;
        }
      } else if (deal.entryType === "OUT") {
        // Exit deal
        if (!positionTimes.has(positionId)) {
          positionTimes.set(positionId, {
            entryTime: deal.time,
            exitTime: deal.time,
            profit: deal.profit + deal.swap + deal.commission + deal.fee,
          });
        } else {
          const pos = positionTimes.get(positionId)!;
          pos.exitTime = deal.time;
          pos.profit = deal.profit + deal.swap + deal.commission + deal.fee;
        }
      }
    }

    const holdingTimes: number[] = [];
    const winningTradeTimes: number[] = [];
    const losingTradeTimes: number[] = [];

    for (const [_, position] of positionTimes) {
      const holdingMinutes = (position.exitTime.getTime() - position.entryTime.getTime()) / (1000 * 60);

      if (holdingMinutes > 0) {
        holdingTimes.push(holdingMinutes);

        if (position.profit > 0) {
          winningTradeTimes.push(holdingMinutes);
        } else if (position.profit < 0) {
          losingTradeTimes.push(holdingMinutes);
        }
      }
    }

    if (holdingTimes.length === 0) {
      return {
        averageHoldingTimeMinutes: 0,
        shortestTradeMinutes: 0,
        longestTradeMinutes: 0,
        averageWinningTradeMinutes: 0,
        averageLosingTradeMinutes: 0,
      };
    }

    const averageHoldingTimeMinutes = holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length;
    const shortestTradeMinutes = Math.min(...holdingTimes);
    const longestTradeMinutes = Math.max(...holdingTimes);
    const averageWinningTradeMinutes =
      winningTradeTimes.length > 0
        ? winningTradeTimes.reduce((a, b) => a + b, 0) / winningTradeTimes.length
        : 0;
    const averageLosingTradeMinutes =
      losingTradeTimes.length > 0 ? losingTradeTimes.reduce((a, b) => a + b, 0) / losingTradeTimes.length : 0;

    return {
      averageHoldingTimeMinutes,
      shortestTradeMinutes,
      longestTradeMinutes,
      averageWinningTradeMinutes,
      averageLosingTradeMinutes,
    };
  }

  /**
   * Get profit distribution analysis
   */
  async getProfitDistribution(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<ProfitDistribution> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 3 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
    });

    if (deals.length === 0) {
      return {
        largestWin: 0,
        largestLoss: 0,
        medianWin: 0,
        medianLoss: 0,
        winningTradesCount: 0,
        losingTradesCount: 0,
        breakEvenTradesCount: 0,
      };
    }

    const wins: number[] = [];
    const losses: number[] = [];
    let breakEvenCount = 0;

    for (const deal of deals) {
      const totalProfit = deal.profit + deal.swap + deal.commission + deal.fee;

      if (totalProfit > 0) {
        wins.push(totalProfit);
      } else if (totalProfit < 0) {
        losses.push(Math.abs(totalProfit));
      } else {
        breakEvenCount++;
      }
    }

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.max(...losses) : 0;

    // Calculate median
    const getMedian = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    const medianWin = getMedian(wins);
    const medianLoss = getMedian(losses);

    return {
      largestWin,
      largestLoss,
      medianWin,
      medianLoss,
      winningTradesCount: wins.length,
      losingTradesCount: losses.length,
      breakEvenTradesCount: breakEvenCount,
    };
  }

  /**
   * Get consistency metrics
   */
  async getConsistencyMetrics(
    accountId: string,
    startDate?: DateTime,
    endDate?: DateTime,
  ): Promise<ConsistencyMetrics> {
    const tradingAccount = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found");
    }

    const queryStartDate = startDate || DateTime.now().minus({ months: 12 });
    const queryEndDate = endDate || DateTime.now();

    const deals = await this.prisma.deal.findMany({
      where: {
        tradingAccountId: accountId,
        deleted: false,
        time: {
          gte: queryStartDate.toJSDate(),
          lte: queryEndDate.toJSDate(),
        },
        entryType: "OUT",
      },
      orderBy: { time: "asc" },
    });

    if (deals.length === 0) {
      return {
        profitableMonths: 0,
        totalMonths: 0,
        consistencyScore: 0,
        bestMonth: { month: "", profit: 0 },
        worstMonth: { month: "", profit: 0 },
      };
    }

    // Group by month
    const monthlyProfits = new Map<string, number>();
    const dailyProfits = new Map<string, number>();

    for (const deal of deals) {
      const dealTime = DateTime.fromJSDate(deal.time);
      const monthKey = dealTime.toFormat("yyyy-MM");
      const dayKey = dealTime.toFormat("yyyy-MM-dd");
      const totalProfit = deal.profit + deal.swap + deal.commission + deal.fee;

      monthlyProfits.set(monthKey, (monthlyProfits.get(monthKey) || 0) + totalProfit);
      dailyProfits.set(dayKey, (dailyProfits.get(dayKey) || 0) + totalProfit);
    }

    const profitableMonths = Array.from(monthlyProfits.values()).filter((p) => p > 0).length;
    const totalMonths = monthlyProfits.size;

    const profitableDays = Array.from(dailyProfits.values()).filter((p) => p > 0).length;
    const consistencyScore = (profitableDays / dailyProfits.size) * 100;

    // Find best and worst months
    let bestMonth = { month: "", profit: -Infinity };
    let worstMonth = { month: "", profit: Infinity };

    for (const [month, profit] of monthlyProfits.entries()) {
      if (profit > bestMonth.profit) {
        bestMonth = { month, profit };
      }
      if (profit < worstMonth.profit) {
        worstMonth = { month, profit };
      }
    }

    return {
      profitableMonths,
      totalMonths,
      consistencyScore,
      bestMonth: bestMonth.profit === -Infinity ? { month: "", profit: 0 } : bestMonth,
      worstMonth: worstMonth.profit === Infinity ? { month: "", profit: 0 } : worstMonth,
    };
  }
}
