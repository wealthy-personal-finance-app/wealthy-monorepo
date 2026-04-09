import {
  createJsonModel,
  parseJsonResponse,
  requireApiKey,
} from "./ragHelpers.js"

const ALLOWED_TYPES = new Set(["expense", "income", "asset", "liability"])

const normalizeType = (value) => {
  if (!value) return null
  const v = String(value).trim().toLowerCase()

  if (ALLOWED_TYPES.has(v)) return v
  if (v.endsWith("s") && ALLOWED_TYPES.has(v.slice(0, -1))) {
    return v.slice(0, -1)
  }

  if (v.includes("expense")) return "expense"
  if (v.includes("income")) return "income"
  if (v.includes("asset")) return "asset"
  if (v.includes("liabilit")) return "liability"

  return null
}

const currentMonthRange = () => {
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  )
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  )
  return {$gte: start.toISOString(), $lte: end.toISOString()}
}

const inferTypeFromInput = (userInput) => {
  const text = String(userInput || "").toLowerCase()
  if (text.includes("expense") || text.includes("spend")) return "expense"
  if (text.includes("income") || text.includes("earn")) return "income"
  if (text.includes("asset")) return "asset"
  if (text.includes("liabilit") || text.includes("debt")) return "liability"
  return null
}

const inferActionFromInput = (userInput) => {
  const text = String(userInput || "").toLowerCase()
  if (
    text.includes("compare") ||
    text.includes("comparison") ||
    text.includes(" vs ") ||
    text.includes("versus")
  ) {
    return "comparison"
  }
  if (text.includes("total") || text.includes("sum")) return "total"
  return "list"
}

const inferTimeLabelFromInput = (userInput) => {
  const text = String(userInput || "").toLowerCase()
  if (text.includes("last month")) return "last month"
  if (text.includes("this month") || text.includes("current month")) {
    return "this month"
  }
  return ""
}

const normalizeFilter = (rawFilter, userInput) => {
  const filter =
    rawFilter && typeof rawFilter === "object" ? {...rawFilter} : {}

  const normalizedType =
    normalizeType(filter.type) || inferTypeFromInput(userInput)
  if (normalizedType) {
    filter.type = normalizedType
  } else {
    delete filter.type
  }

  if (!filter.parentCategory || String(filter.parentCategory).trim() === "") {
    delete filter.parentCategory
  }

  if (!filter.subCategory || String(filter.subCategory).trim() === "") {
    delete filter.subCategory
  }

  if (filter.date && typeof filter.date === "object") {
    const hasDateRange = Boolean(filter.date.$gte || filter.date.$lte)
    if (!hasDateRange) delete filter.date
  } else {
    delete filter.date
  }

  const text = String(userInput || "").toLowerCase()
  if (
    !filter.date &&
    (text.includes("this month") || text.includes("current month"))
  ) {
    filter.date = currentMonthRange()
  }

  return filter
}

export const generateMongoQuery = async (userInput) => {
  const apiKey = requireApiKey("generateMongoQuery")
  const model = createJsonModel(apiKey)

  const prompt = `
    Convert the user input into a MongoDB filter object based on this schema:
    - type: "expense", "income", "asset", "liability"
    - parentCategory: (e.g., Food, Transport, Salary)
    - subCategory: (e.g., Dining Out, Groceries, Bonus)
    - date: Use ISO strings for ranges.

    Current Date: ${new Date().toISOString()}

    Return JSON: { 
      "filter": { "type": "string", "parentCategory": "string", "date": { "$gte": "ISO", "$lte": "ISO" } },
      "action": "total" | "list" | "comparison",
      "time_label": "e.g., last month"
    }
    Input: "${userInput}"
  `

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const parsed = parseJsonResponse(raw, {})

  const filter = normalizeFilter(parsed.filter, userInput)

  return {
    filter,
    action: parsed.action || inferActionFromInput(userInput),
    time_label: parsed.time_label || inferTimeLabelFromInput(userInput),
  }
}
