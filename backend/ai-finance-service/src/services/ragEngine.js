import {Transaction} from "@wealthy/common"
import {generateMongoQuery} from "../utils/queryGenerator.js"
import {
  buildPersonalFinanceContext,
  createTextModel,
  isComparisonRequest,
  requireApiKey,
  resolveComparisonRanges,
  summarizeTransactions,
} from "../utils/ragHelpers.js"

const generateFinalAnswer = async (question, data) => {
  const apiKey = requireApiKey("ragEngine")
  const model = createTextModel(apiKey)

  const isComparisonData = data && data.mode === "comparison"

  const prompt = isComparisonData
    ? `
    You are a Financial Intelligence System.
    The user asked a comparison question. Use BOTH periods below and compare clearly.

    Question: "${question}"

    Comparison Data: ${JSON.stringify(data)}

    Rules:
    - Report each period's total amount and transaction count.
    - State the difference (increase/decrease) between periods.
    - If one side has no data, still show both sides and explain that side is zero.
    - Keep answer concise and factual.
  `
    : data && data.mode === "personal_generalized"
    ? `
    You are a Financial Intelligence System for personal finance analytics.

    Question: "${question}"
    Analytics Context: ${JSON.stringify(data)}

    Instructions:
    - Use analytics context first; do not invent values.
    - Answer naturally for any of these question styles: expenses, income/cashflow, category analysis, trends, budgeting signals, savings, assets/liabilities, net worth proxy, recommendations.
    - When relevant, include exact totals and short comparisons.
    - If data is sparse or missing for the asked period, say that clearly and suggest what to add.
    - Keep it concise, practical, and user-friendly.
  `
    : `
    You are a Financial Intelligence System. 
    Using the following user transaction data, answer the question accurately.
    
    User Data: ${JSON.stringify(data)}
    Question: "${question}"
    
    Provide a professional, helpful, concise response. If no data is found, advise the user to add transactions.
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export const startRAGFlow = async (message, userId) => {
  const intent = await generateMongoQuery(message)

  console.log("RAG intent:", JSON.stringify(intent))

  const safeFilter =
    intent?.filter && typeof intent.filter === "object" ? intent.filter : {}
  const {date: _ignoredDate, ...baseFilterWithoutDate} = safeFilter
  const baseFilter = {userId, ...baseFilterWithoutDate}

  if (isComparisonRequest(message, intent)) {
    const ranges = resolveComparisonRanges(message)

    const currentFilter = {
      ...baseFilter,
      date: {$gte: ranges.current.start, $lte: ranges.current.end},
    }
    const previousFilter = {
      ...baseFilter,
      date: {$gte: ranges.previous.start, $lte: ranges.previous.end},
    }

    console.log("RAG comparison current filter:", JSON.stringify(currentFilter))
    console.log(
      "RAG comparison previous filter:",
      JSON.stringify(previousFilter)
    )

    const [currentTransactions, previousTransactions] = await Promise.all([
      Transaction.find(currentFilter).sort({date: -1}),
      Transaction.find(previousFilter).sort({date: -1}),
    ])

    const payload = {
      mode: "comparison",
      currentPeriod: {
        label: ranges.current.label,
        range: {
          start: ranges.current.start.toISOString(),
          end: ranges.current.end.toISOString(),
        },
        summary: summarizeTransactions(currentTransactions),
        transactions: currentTransactions,
      },
      previousPeriod: {
        label: ranges.previous.label,
        range: {
          start: ranges.previous.start.toISOString(),
          end: ranges.previous.end.toISOString(),
        },
        summary: summarizeTransactions(previousTransactions),
        transactions: previousTransactions,
      },
    }

    console.log(
      "RAG comparison counts:",
      payload.currentPeriod.summary.count,
      payload.previousPeriod.summary.count
    )

    return await generateFinalAnswer(message, payload)
  }

  const queryFilter = {userId, ...safeFilter}
  if (queryFilter.date) {
    if (queryFilter.date.$gte)
      queryFilter.date.$gte = new Date(queryFilter.date.$gte)
    if (queryFilter.date.$lte)
      queryFilter.date.$lte = new Date(queryFilter.date.$lte)
  }

  console.log("RAG Mongo filter:", JSON.stringify(queryFilter))

  const [transactions, allTransactions] = await Promise.all([
    Transaction.find(queryFilter).sort({date: -1}),
    Transaction.find({userId}).sort({date: -1}).limit(1000),
  ])
  console.log("RAG matched transactions:", transactions.length)
  console.log("RAG user total transactions:", allTransactions.length)

  const context = buildPersonalFinanceContext(
    message,
    transactions,
    allTransactions
  )
  return await generateFinalAnswer(message, context)
}
