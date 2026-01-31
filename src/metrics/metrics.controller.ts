import { CacheService } from "@/cache/cache.service";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { PrismaService } from "@/prisma.service";
import { DateTime } from "luxon";
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Query,
  UseFilters,
  UseInterceptors,
  Param,
  ParseIntPipe,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from "@nestjs/swagger";
import { MetricsService } from "./metrics.service";
import { CacheResponse } from "@/cache/cache.decorator";
import CacheKeys from "@/cache/cache-keys.constants";

@ApiTags("Trading Metrics")
@Controller("metrics")
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
@ApiBearerAuth()
export class MetricsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private metricsService: MetricsService,
  ) {}

  private parseDate(dateString?: string): DateTime | undefined {
    if (!dateString) return undefined;

    const date = DateTime.fromISO(dateString);
    if (!date.isValid) {
      throw new BadRequestException(`Invalid date format: ${dateString}. Use ISO format (YYYY-MM-DD).`);
    }

    return date;
  }

  @Get("vitals")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get trading account vitals",
    description: "Retrieves key trading metrics (win rate, profit factor, drawdown, etc.)",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved trading vitals",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountVitals() })
  async getVitals(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getVitals(tradingAccountId, start, end);
  }

  @Get("equity-growth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get equity growth over time",
    description: "Retrieves equity progression for the past 12 months or specified date range",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved equity growth data",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountEquityGrowth() })
  async getEquityGrowth(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getEquityGrowth(tradingAccountId, start, end);
  }

  @Get("daily-trades/:year/:month")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get daily trades for a specific month",
    description: "Retrieves number of trades and total profit/loss for each day of the specified month",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved daily trades data",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid month or year",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountDailyTrades() })
  async getDailyTradesForMonth(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Param("year", new ParseIntPipe()) year: number,
    @Param("month", new ParseIntPipe()) month: number,
  ) {
    // Validate month is between 1 and 12
    if (month < 1 || month > 12) {
      throw new BadRequestException("Month must be between 1 and 12");
    }

    // Validate year is reasonable (e.g., not in the future beyond current year)
    const currentYear = DateTime.now().year;
    if (year > currentYear + 1) {
      throw new BadRequestException(`Year cannot be greater than ${currentYear + 1}`);
    }

    return this.metricsService.getDailyTradesForMonth(tradingAccountId, year, month);
  }

  @Get("advanced-metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get advanced trading metrics",
    description: "Calculates expectancy, Sharpe ratio, Sortino ratio, and Calmar ratio",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved advanced metrics",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountAdvanceMetrics() })
  async getAdvancedMetrics(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getAdvancedMetrics(tradingAccountId, start, end);
  }

  @Get("profit-by-day")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get profit by day of week",
    description: "Calculates total profit or loss for each day of the week",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved profit by day data",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountProfitByDayWeek() })
  async getProfitByDayOfWeek(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getProfitByDayOfWeek(tradingAccountId, start, end);
  }

  @Get("session-metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get trading session metrics",
    description: "Analyzes trading performance by market session (Asian, London, New York)",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved session metrics",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountSessionMetrics() })
  async getSessionMetrics(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getSessionMetrics(tradingAccountId, start, end);
  }

  @Get("streak-analysis")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get streak analysis",
    description: "Analyzes winning and losing streaks, including current streak and averages",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved streak analysis",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountStreakAnalysis() })
  async getStreakAnalysis(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getStreakAnalysis(tradingAccountId, start, end);
  }

  @Get("trade-frequency")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get trade frequency analysis",
    description: "Calculates average trades per day, busiest and slowest trading days",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved trade frequency data",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountTradeFrequency() })
  async getTradeFrequency(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getTradeFrequency(tradingAccountId, start, end);
  }

  @Get("holding-time")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get holding time analysis",
    description: "Analyzes how long positions are held before closing",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved holding time analysis",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountHoldingTime() })
  async getHoldingTimeAnalysis(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getHoldingTimeAnalysis(tradingAccountId, start, end);
  }

  @Get("profit-distribution")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get profit distribution analysis",
    description: "Analyzes the distribution of wins and losses (largest, median, counts)",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved profit distribution",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountProfitDistribution() })
  async getProfitDistribution(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getProfitDistribution(tradingAccountId, start, end);
  }

  @Get("consistency-metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get consistency metrics",
    description: "Measures trading consistency over time (profitable months, consistency score)",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved consistency metrics",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountConsistencyMetrics() })
  async getConsistencyMetrics(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    return this.metricsService.getConsistencyMetrics(tradingAccountId, start, end);
  }

  @Get("summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get comprehensive trading summary",
    description: "Retrieves all metrics in a single call for dashboard display",
  })
  @ApiQuery({
    name: "tradingAccountId",
    required: true,
    description: "ID of the trading account",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date in ISO format (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date in ISO format (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved comprehensive trading summary",
  })
  @ApiResponse({
    status: 404,
    description: "Trading account not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid date format",
  })
  @CacheResponse({ keyPrefix: CacheKeys.tradingAccountTradeSummary() })
  async getTradingSummary(
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Query("tradingAccountId") tradingAccountId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    // Execute all metrics in parallel for better performance
    const [
      vitals,
      equityGrowth,
      advancedMetrics,
      profitByDay,
      sessionMetrics,
      streakAnalysis,
      tradeFrequency,
      holdingTime,
      profitDistribution,
      consistencyMetrics,
    ] = await Promise.all([
      this.metricsService.getVitals(tradingAccountId, start, end),
      this.metricsService.getEquityGrowth(tradingAccountId, start, end),
      this.metricsService.getAdvancedMetrics(tradingAccountId, start, end),
      this.metricsService.getProfitByDayOfWeek(tradingAccountId, start, end),
      this.metricsService.getSessionMetrics(tradingAccountId, start, end),
      this.metricsService.getStreakAnalysis(tradingAccountId, start, end),
      this.metricsService.getTradeFrequency(tradingAccountId, start, end),
      this.metricsService.getHoldingTimeAnalysis(tradingAccountId, start, end),
      this.metricsService.getProfitDistribution(tradingAccountId, start, end),
      this.metricsService.getConsistencyMetrics(tradingAccountId, start, end),
    ]);

    // Get current month and previous month for comparison
    const now = DateTime.now();
    const currentMonth = await this.metricsService.getDailyTradesForMonth(
      tradingAccountId,
      now.year,
      now.month,
    );

    const previousMonth = await this.metricsService.getDailyTradesForMonth(
      tradingAccountId,
      now.month === 1 ? now.year - 1 : now.year,
      now.month === 1 ? 12 : now.month - 1,
    );

    return {
      vitals,
      equityGrowth,
      advancedMetrics,
      profitByDay,
      sessionMetrics,
      streakAnalysis,
      tradeFrequency,
      holdingTime,
      profitDistribution,
      consistencyMetrics,
      monthlyComparison: {
        currentMonth,
        previousMonth,
      },
      dateRange: {
        start: start?.toISO() || null,
        end: end?.toISO() || null,
      },
      timestamp: DateTime.now().toISO(),
    };
  }
}
