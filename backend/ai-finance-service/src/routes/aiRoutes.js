import express from "express"
import {protect} from "@wealthy/common"
import {
  handleChat,
  getChatHistory,
  getConversationById,
  getSuggestedQuestions,
} from "../controllers/aiController.js"
import {checkChatLimit} from "../middleware/usageLimit.js"

const router = express.Router()

router.post("/chat", protect, checkChatLimit, handleChat)

router.get("/history", protect, getChatHistory)
router.get("/history/:id", protect, getConversationById)
router.get("/suggestions", protect, getSuggestedQuestions)

export default router
