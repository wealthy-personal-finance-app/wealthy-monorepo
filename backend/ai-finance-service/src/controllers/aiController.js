import {successResponse, errorResponse, Conversation} from "@wealthy/common"
import {
  classifyQuery,
  classifyConversationalOpener,
} from "../utils/classifier.js"
import {generateGeneralResponse} from "../services/generalFinanceService.js"
import {startRAGFlow} from "../services/ragEngine.js"
import {generateSuggestedQuestions} from "../services/suggestionService.js"

const getLastMessageByRole = (messages = [], role) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === role) return messages[i]
  }
  return null
}

export const handleChat = async (req, res) => {
  try {
    const {message, conversationId} = req.body
    const userId = req.user.id
    let answer = ""
    let responseLabel = "Success"

    let chat = null
    if (conversationId) {
      chat = await Conversation.findOne({_id: conversationId, userId})
    }

    const recentMessages = Array.isArray(chat?.messages)
      ? chat.messages.slice(-6).map((m) => ({role: m.role, content: m.content}))
      : []

    const lastUserMessage = getLastMessageByRole(chat?.messages || [], "user")
    const lastAssistantMessage = getLastMessageByRole(
      chat?.messages || [],
      "assistant"
    )

    let effectiveMessage = message

    // 1. Guardrail & Classifier Check [Feature 5 & 9]
    const decision = await classifyQuery(message, {recentMessages})
    console.log(decision)

    if (decision.classification === "CONTINUATION" && lastUserMessage) {
      const previousDecision = await classifyQuery(lastUserMessage.content)
      if (
        previousDecision.classification === "GENERAL" ||
        previousDecision.classification === "PERSONAL"
      ) {
        decision.classification = previousDecision.classification

        // Build a contextual message so response generators can answer follow-ups.
        effectiveMessage = [
          lastUserMessage?.content
            ? `Previous user question: ${lastUserMessage.content}`
            : "",
          lastAssistantMessage?.content
            ? `Previous assistant answer: ${lastAssistantMessage.content}`
            : "",
          `Follow-up from user: ${message}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      } else {
        decision.classification = "NON_FINANCE"
      }
    }

    if (decision.classification === "CONTINUATION" && !lastUserMessage) {
      // Treat first-turn conversational openers as a valid start, then guide user to finance topics.
      decision.classification = "GENERAL"
      effectiveMessage = `
The user started with a conversational opener (like a greeting) and has not asked a specific finance question yet.
Reply with a short, friendly welcome and ask what finance topic they want help with.
Keep it concise.

User message: "${message}"
      `.trim()
    }

    if (decision.classification === "NON_FINANCE") {
      const openerDecision = await classifyConversationalOpener(message)
      if (openerDecision.label === "SOCIAL_OPENER") {
        decision.classification = "GENERAL"
        effectiveMessage = `
The user sent a conversational opener and has not asked a concrete topic question yet.
Reply with a short, friendly welcome and ask what finance topic they want help with.
Keep it concise.

User message: "${message}"
        `.trim()
      }
    }

    // Flow: NON-FINANCE -> Block [cite: 7, 11]
    if (decision.classification === "NON_FINANCE") {
      answer =
        "I am your financial assistant. I only process queries related to finance."
      responseLabel = "Blocked"
    }

    // Flow: GENERAL -> Direct AI [cite: 3, 11]
    if (decision.classification === "GENERAL") {
      answer = await generateGeneralResponse(effectiveMessage)
      responseLabel = "General Insight"
    }

    // Flow: USER DATA -> RAG Flow
    if (decision.classification === "PERSONAL") {
      answer = await startRAGFlow(effectiveMessage, req.user.id)
      responseLabel = "Personal Insight"
    }

    if (!answer) {
      answer =
        "I could not classify this request clearly. Please rephrase your finance question."
      responseLabel = "Unclear Request"
    }

    if (!chat) {
      chat = new Conversation({userId, title: message.substring(0, 30)})
    }

    chat.messages.push(
      {role: "user", content: message},
      {role: "assistant", content: answer}
    )

    await chat.save()

    return successResponse(res, 200, responseLabel, {
      answer,
      conversationId: chat._id,
    })
  } catch (error) {
    return errorResponse(res, 500, "AI Service Error", error.message)
  }
}

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id

    const history = await Conversation.find({userId})
      .select("title _id updatedAt")
      .sort({updatedAt: -1})

    return successResponse(res, 200, "Chat history retrieved", {data: history})
  } catch (error) {
    return errorResponse(res, 500, "Failed to fetch history", error.message)
  }
}

export const getConversationById = async (req, res) => {
  try {
    const {id} = req.params
    const userId = req.user.id

    const chat = await Conversation.findOne({_id: id, userId})

    if (!chat) {
      return errorResponse(res, 404, "Conversation not found")
    }

    return successResponse(res, 200, "Conversation loaded", {data: chat})
  } catch (error) {
    return errorResponse(res, 500, "Error loading chat", error.message)
  }
}

export const getSuggestedQuestions = async (req, res) => {
  try {
    const userId = req.user.id

    const chats = await Conversation.find({userId})
      .select("messages updatedAt")
      .sort({updatedAt: -1})
      .limit(3)

    const recentUserQuestions = chats.flatMap((chat) => {
      const userMessages = (chat.messages || [])
        .filter((m) => m.role === "user" && String(m.content || "").trim())
        .slice(-3)
        .map((m) => String(m.content).trim())
      return userMessages
    })

    const suggestions = await generateSuggestedQuestions(recentUserQuestions)

    return successResponse(res, 200, "AI suggestions generated", {
      suggestions,
      sourceQuestionCount: recentUserQuestions.length,
    })
  } catch (error) {
    return errorResponse(
      res,
      500,
      "Failed to generate AI suggestions",
      error.message
    )
  }
}
