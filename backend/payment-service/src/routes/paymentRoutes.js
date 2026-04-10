import express from "express"
import {protect} from "@wealthy/common"
import {
  webhook,
  checkout,
  getUserSubscription,
} from "../controllers/paymentController.js"

const router = express.Router()

router.post("/webhook", express.raw({type: "application/json"}), webhook)

router.post("/subscribe", protect, express.json(), checkout)

router.get("/subscription", protect, getUserSubscription)

export default router
