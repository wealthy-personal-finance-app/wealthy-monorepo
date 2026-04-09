import {
  createJsonModel,
  parseJsonResponse,
  requireApiKey,
} from "./ragHelpers.js"

const ALLOWED_CLASSIFICATIONS = new Set([
  "PERSONAL",
  "GENERAL",
  "NON_FINANCE",
  "CONTINUATION",
])

const normalizeClassification = (value) => {
  const c = String(value || "")
    .trim()
    .toUpperCase()
  if (ALLOWED_CLASSIFICATIONS.has(c)) return c
  return "NON_FINANCE"
}

const normalizeOpenerLabel = (value) => {
  const label = String(value || "")
    .trim()
    .toUpperCase()
  if (label === "SOCIAL_OPENER" || label === "NOT_OPENER") return label
  return "NOT_OPENER"
}

export const classifyQuery = async (userInput, options = {}) => {
  const apiKey = requireApiKey("classifyQuery")

  const recentMessages = Array.isArray(options.recentMessages)
    ? options.recentMessages.slice(-6).map((m) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: String(m?.content || "").slice(0, 600),
      }))
    : []

  const model = createJsonModel(apiKey)

  const prompt = `
    Classify the current message for a finance assistant.

    Labels:
    - "PERSONAL": User asks about their own transactions/history/spending/income/assets/debts.
    - "GENERAL": Finance education/advice that does not require their personal stored data.
    - "NON_FINANCE": Unrelated to finance.
    - "CONTINUATION": Message is ambiguous/short/referential and depends on previous turns (e.g. follow-up/confirmation) rather than introducing a new topic.

    Rules:
    - Use RECENT_MESSAGES for context when needed.
    - If CURRENT_MESSAGE clearly starts a non-finance topic, output NON_FINANCE even if previous messages were finance.
    - If CURRENT_MESSAGE is a follow-up to an existing finance thread, output CONTINUATION.
    - Greetings/social openers/thanks/acknowledgements without a clear topic (e.g., hello, hi, thanks, okay) should be CONTINUATION, not NON_FINANCE.
    - Do not output any label outside the 4 labels above.

    RECENT_MESSAGES: ${JSON.stringify(recentMessages)}
    CURRENT_MESSAGE: "${String(userInput || "")}" 

    Return strict JSON only:
    { "classification": "PERSONAL|GENERAL|NON_FINANCE|CONTINUATION", "reason": "short explanation" }
  `

  const result = await model.generateContent(prompt)
  const parsed = parseJsonResponse(result.response.text(), {})

  return {
    classification: normalizeClassification(parsed.classification),
    reason: String(parsed.reason || ""),
  }
}

export const classifyConversationalOpener = async (userInput) => {
  const apiKey = requireApiKey("classifyConversationalOpener")
  const model = createJsonModel(apiKey)

  const prompt = `
    Decide whether CURRENT_MESSAGE is only a social/conversational opener.

    Output labels:
    - "SOCIAL_OPENER": greeting, thanks, ack, or friendly opener without a specific topic request.
    - "NOT_OPENER": any concrete topical request/question (finance or non-finance).

    CURRENT_MESSAGE: "${String(userInput || "")}" 

    Return strict JSON only:
    { "label": "SOCIAL_OPENER|NOT_OPENER", "reason": "short explanation" }
  `

  const result = await model.generateContent(prompt)
  const parsed = parseJsonResponse(result.response.text(), {})

  return {
    label: normalizeOpenerLabel(parsed.label),
    reason: String(parsed.reason || ""),
  }
}
