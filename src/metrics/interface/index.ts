// DTOs and Interfaces
export interface SessionMetrics {
  session: string;
  trades: number;
  winRate: number;
  percentageOfTotal: number;
}

export interface Vitals {
  winRate: number;
  profitFactor: number;
  averageRiskToReward: number;
  netProfit: number;
  percentageDrawdown: number;
  averageWin: number;
  averageLoss: number;
}

export interface AdvancedMetrics {
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
}

export interface DailyProfit {
  day: string;
  profit: number;
}

export interface StreakAnalysis {
  maxWinningStreak: number;
  maxLosingStreak: number;
  currentStreak: number;
  currentStreakType: "winning" | "losing" | "none";
  averageWinningStreak: number;
  averageLosingStreak: number;
}

export interface TradeFrequency {
  averageTradesPerDay: number;
  totalTradingDays: number;
  totalTrades: number;
  busiestDay: string;
  busiestDayTrades: number;
  slowestDay: string;
  slowestDayTrades: number;
}

export interface HoldingTimeAnalysis {
  averageHoldingTimeMinutes: number;
  shortestTradeMinutes: number;
  longestTradeMinutes: number;
  averageWinningTradeMinutes: number;
  averageLosingTradeMinutes: number;
}

export interface ProfitDistribution {
  largestWin: number;
  largestLoss: number;
  medianWin: number;
  medianLoss: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakEvenTradesCount: number;
}

export interface ConsistencyMetrics {
  profitableMonths: number;
  totalMonths: number;
  consistencyScore: number; // Percentage of profitable days
  bestMonth: { month: string; profit: number };
  worstMonth: { month: string; profit: number };
}

export interface EquityGrowthPoint {
  period: string;
  equity: number;
}

export interface DailyTradeStats {
  date: string;
  tradeCount: number;
  profitLoss: number;
}
