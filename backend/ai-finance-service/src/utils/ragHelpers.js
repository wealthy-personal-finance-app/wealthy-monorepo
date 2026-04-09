import {GoogleGenerativeAI} from "@google/generative-ai"

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100

const extractJson = (rawText) => {
  const cleaned = String(rawText || "").trim()
  const withoutFence = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  const firstBrace = withoutFence.indexOf("{")
  const lastBrace = withoutFence.lastIndexOf("}")

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1)
  }

  return withoutFence
}

const requireApiKey = (context = "service") => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(`GEMINI_API_KEY is undefined in ${context}`)
  }
  return apiKey
}

const createJsonModel = (apiKey, modelName = process.env.CHAT_MODEL) => {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: modelName || "gemini-3.1-flash-lite-preview",
    generationConfig: {responseMimeType: "application/json"},
  })
}

const createTextModel = (apiKey, modelName = process.env.CHAT_MODEL) => {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: modelName || "gemini-3.1-flash-lite-preview",
  })
}

const parseJsonResponse = (rawText, fallback = {}) => {
  try {
    return JSON.parse(extractJson(rawText))
  } catch {
    return fallback
  }
}

const toMonthKey = (dateValue) => {
  const d = new Date(dateValue)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

const isDateInRange = (dateValue, start, end) => {
  const d = new Date(dateValue)
  return d >= start && d <= end
}

const totalAmount = (items) =>
  round2(items.reduce((sum, tx) => sum + Number(tx.amount || 0), 0))

const topNByAmount = (transactions, field, n = 3) => {
  const map = new Map()
  transactions.forEach((tx) => {
    const key = tx[field] || "Uncategorized"
    map.set(key, (map.get(key) || 0) + Number(tx.amount || 0))
  })

  return [...map.entries()]
    .map(([name, amount]) => ({name, amount: round2(amount)}))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
}

const monthRangeUtc = (year, monthIndex) => {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999))
  return {start, end}
}

const buildMonthlySummary = (transactions) => {
  const byMonth = new Map()

  transactions.forEach((tx) => {
    const key = toMonthKey(tx.date)
    if (!byMonth.has(key)) {
      byMonth.set(key, {
        month: key,
        income: 0,
        expense: 0,
        asset: 0,
        liability: 0,
      })
    }

    const bucket = byMonth.get(key)
    const amount = Number(tx.amount || 0)
    if (bucket[tx.type] != null) bucket[tx.type] += amount
  })

  return [...byMonth.values()]
    .map((m) => ({
      ...m,
      income: round2(m.income),
      expense: round2(m.expense),
      asset: round2(m.asset),
      liability: round2(m.liability),
      netCashFlow: round2(m.income - m.expense),
      netWorthProxy: round2(m.asset - m.liability),
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
}

const buildPersonalFinanceContext = (
  message,
  focusedTransactions,
  allTransactions
) => {
  const now = new Date()
  const thisMonth = monthRangeUtc(now.getUTCFullYear(), now.getUTCMonth())
  const lastMonth = monthRangeUtc(now.getUTCFullYear(), now.getUTCMonth() - 1)

  const thisMonthTx = allTransactions.filter((tx) =>
    isDateInRange(tx.date, thisMonth.start, thisMonth.end)
  )
  const lastMonthTx = allTransactions.filter((tx) =>
    isDateInRange(tx.date, lastMonth.start, lastMonth.end)
  )

  const thisIncome = totalAmount(
    thisMonthTx.filter((tx) => tx.type === "income")
  )
  const thisExpense = totalAmount(
    thisMonthTx.filter((tx) => tx.type === "expense")
  )
  const thisAsset = totalAmount(thisMonthTx.filter((tx) => tx.type === "asset"))
  const thisLiability = totalAmount(
    thisMonthTx.filter((tx) => tx.type === "liability")
  )

  const lastIncome = totalAmount(
    lastMonthTx.filter((tx) => tx.type === "income")
  )
  const lastExpense = totalAmount(
    lastMonthTx.filter((tx) => tx.type === "expense")
  )

  const thisSavings = round2(thisIncome - thisExpense)
  const savingsRate =
    thisIncome > 0 ? round2((thisSavings / thisIncome) * 100) : null

  return {
    mode: "personal_generalized",
    question: message,
    focusedResult: {
      count: focusedTransactions.length,
      totalAmount: totalAmount(focusedTransactions),
      topExpenseParentCategories: topNByAmount(
        focusedTransactions.filter((tx) => tx.type === "expense"),
        "parentCategory",
        5
      ),
      transactions: focusedTransactions,
    },
    overview: {
      transactionCount: allTransactions.length,
      totalsByType: {
        expense: totalAmount(
          allTransactions.filter((tx) => tx.type === "expense")
        ),
        income: totalAmount(
          allTransactions.filter((tx) => tx.type === "income")
        ),
        asset: totalAmount(allTransactions.filter((tx) => tx.type === "asset")),
        liability: totalAmount(
          allTransactions.filter((tx) => tx.type === "liability")
        ),
      },
      topExpenseParentCategories: topNByAmount(
        allTransactions.filter((tx) => tx.type === "expense"),
        "parentCategory",
        5
      ),
      topExpenseSubCategories: topNByAmount(
        allTransactions.filter((tx) => tx.type === "expense"),
        "subCategory",
        5
      ),
      monthlySummary: buildMonthlySummary(allTransactions),
    },
    thisMonth: {
      range: {
        start: thisMonth.start.toISOString(),
        end: thisMonth.end.toISOString(),
      },
      income: thisIncome,
      expense: thisExpense,
      asset: thisAsset,
      liability: thisLiability,
      netCashFlow: round2(thisIncome - thisExpense),
      netWorthProxy: round2(thisAsset - thisLiability),
      savings: thisSavings,
      savingsRatePercent: savingsRate,
      count: thisMonthTx.length,
    },
    lastMonth: {
      range: {
        start: lastMonth.start.toISOString(),
        end: lastMonth.end.toISOString(),
      },
      income: lastIncome,
      expense: lastExpense,
      netCashFlow: round2(lastIncome - lastExpense),
      count: lastMonthTx.length,
    },
  }
}

const isComparisonRequest = (message, intent) => {
  const text = String(message || "").toLowerCase()
  if (intent?.action === "comparison") return true
  return (
    text.includes("compare") ||
    text.includes("comparison") ||
    text.includes(" vs ") ||
    text.includes("versus")
  )
}

const resolveComparisonRanges = (message) => {
  const now = new Date()
  const text = String(message || "").toLowerCase()

  const thisMonth = monthRangeUtc(now.getUTCFullYear(), now.getUTCMonth())
  const lastMonth = monthRangeUtc(now.getUTCFullYear(), now.getUTCMonth() - 1)
  const previousMonth = monthRangeUtc(
    now.getUTCFullYear(),
    now.getUTCMonth() - 2
  )

  if (
    text.includes("last month") &&
    (text.includes("compare") || text.includes("vs") || text.includes("versus"))
  ) {
    return {
      current: {...thisMonth, label: "this month"},
      previous: {...lastMonth, label: "last month"},
    }
  }

  if (
    text.includes("this month") &&
    (text.includes("last month") || text.includes("previous month"))
  ) {
    return {
      current: {...thisMonth, label: "this month"},
      previous: {...lastMonth, label: "last month"},
    }
  }

  if (text.includes("last month") && text.includes("previous month")) {
    return {
      current: {...lastMonth, label: "last month"},
      previous: {...previousMonth, label: "previous month"},
    }
  }

  return {
    current: {...thisMonth, label: "this month"},
    previous: {...lastMonth, label: "last month"},
  }
}

const summarizeTransactions = (transactions) => {
  const total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  return {
    count: transactions.length,
    total,
  }
}

export {
  buildPersonalFinanceContext,
  createJsonModel,
  createTextModel,
  extractJson,
  isComparisonRequest,
  monthRangeUtc,
  parseJsonResponse,
  requireApiKey,
  resolveComparisonRanges,
  summarizeTransactions,
}
