import {
  createJsonModel,
  parseJsonResponse,
  requireApiKey,
} from "../utils/ragHelpers.js"

const normalizeSuggestions = (items) => {
  if (!Array.isArray(items)) return []

  const unique = []
  const seen = new Set()

  for (const item of items) {
    const text = String(item || "").trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(text)
    if (unique.length === 3) break
  }

  return unique
}

const fallbackSuggestions = (questions = []) => {
  const hasExpense = questions.some((q) => /expense|spend|cost/i.test(q))
  const hasIncome = questions.some((q) => /income|salary|earn/i.test(q))

  const defaults = [
    hasExpense
      ? "What are my top expense categories this month, and how can I reduce them?"
      : "How should I split my monthly budget across needs, wants, and savings?",
    hasIncome
      ? "How can I improve my savings rate based on my current income and spending?"
      : "What is a good beginner plan to build savings in the next 3 months?",
    "What is one actionable finance goal I should focus on this week?",
  ]

  return normalizeSuggestions(defaults)
}

export const generateSuggestedQuestions = async (recentQuestions = []) => {
  const apiKey = requireApiKey("generateSuggestedQuestions")

  const cleanQuestions = recentQuestions
    .map((q) => String(q || "").trim())
    .filter(Boolean)
    .slice(0, 9)

  if (cleanQuestions.length === 0) {
    return fallbackSuggestions([])
  }

  const model = createJsonModel(apiKey)

  const prompt = `
    You are generating smart follow-up prompts for a personal finance chat app.

    Input: a user's recent finance-related questions.
    Task: produce exactly 3 useful next questions the user can ask.

    Rules:
    - Keep each suggestion concise and practical.
    - Suggestions must remain finance-related.
    - Avoid repeating the same wording from input.
    - Return strict JSON only.
    - Don't give long questions. keep it short and concise.

    Recent questions: ${JSON.stringify(cleanQuestions)}

    Return JSON:
    { "suggestions": ["q1", "q2", "q3"] }
  `

  const result = await model.generateContent(prompt)
  const parsed = parseJsonResponse(result.response.text(), {})

  const suggestions = normalizeSuggestions(parsed.suggestions)
  if (suggestions.length === 3) return suggestions

  return fallbackSuggestions(cleanQuestions)
}
