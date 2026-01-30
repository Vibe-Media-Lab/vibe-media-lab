interface CostEntry {
  userId: string
  provider: string
  mediaType: string
  cost: number
  timestamp: Date
}

interface UsageSummary {
  totalCost: number
  byProvider: Record<string, number>
  byMediaType: Record<string, number>
  count: number
}

export class CostTracker {
  private entries: CostEntry[] = []
  private monthlyBudgets: Map<string, number> = new Map()

  track(entry: CostEntry): void {
    this.entries.push(entry)
  }

  setMonthlyBudget(userId: string, budget: number): void {
    this.monthlyBudgets.set(userId, budget)
  }

  getMonthlyUsage(userId: string): UsageSummary {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const userEntries = this.entries.filter(
      (e) => e.userId === userId && e.timestamp >= startOfMonth
    )

    return this.summarize(userEntries)
  }

  getDailyUsage(userId: string, date: Date = new Date()): UsageSummary {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const userEntries = this.entries.filter(
      (e) =>
        e.userId === userId &&
        e.timestamp >= startOfDay &&
        e.timestamp <= endOfDay
    )

    return this.summarize(userEntries)
  }

  isWithinBudget(userId: string, additionalCost: number = 0): boolean {
    const budget = this.monthlyBudgets.get(userId)
    if (!budget) return true

    const usage = this.getMonthlyUsage(userId)
    return usage.totalCost + additionalCost <= budget
  }

  getRemainingBudget(userId: string): number | null {
    const budget = this.monthlyBudgets.get(userId)
    if (!budget) return null

    const usage = this.getMonthlyUsage(userId)
    return Math.max(0, budget - usage.totalCost)
  }

  private summarize(entries: CostEntry[]): UsageSummary {
    const byProvider: Record<string, number> = {}
    const byMediaType: Record<string, number> = {}
    let totalCost = 0

    for (const entry of entries) {
      totalCost += entry.cost
      byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.cost
      byMediaType[entry.mediaType] =
        (byMediaType[entry.mediaType] || 0) + entry.cost
    }

    return {
      totalCost,
      byProvider,
      byMediaType,
      count: entries.length,
    }
  }

  cleanup(olderThan: Date): void {
    this.entries = this.entries.filter((e) => e.timestamp >= olderThan)
  }
}

// Singleton instance
let costTrackerInstance: CostTracker | null = null

export function getCostTracker(): CostTracker {
  if (!costTrackerInstance) {
    costTrackerInstance = new CostTracker()
  }
  return costTrackerInstance
}
