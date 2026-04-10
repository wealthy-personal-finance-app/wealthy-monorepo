import express from "express"
//import { addTransaction, deleteTransaction, getCategories, getTransactionById, getTransactions, updateTransaction } from '../controllers/transactionController.js';
import {
  addTransaction,
  createCategory,
  deleteTransaction,
  getCategories,
  getTransactionById,
  getTransactions,
  updateTransaction,
  getDashboardSummary,
  getChartData,
  getSpendingByCategory,
  getSavings,
} from "../controllers/transactionController.js"
import {protect} from "@wealthy/common/middleware/authMiddleware.js"

const router = express.Router()

router.post("/", protect, addTransaction)
router.post("/categories", protect, createCategory)
router.get("/", protect, getTransactions)
router.get("/categories", protect, getCategories)
router.get("/:id", protect, getTransactionById)
router.patch("/:id", protect, updateTransaction)
router.delete("/:id", protect, deleteTransaction)

// ===== DASHBOARD ROUTES =====
router.get("/dashboard/summary", protect, getDashboardSummary)
router.get("/dashboard/chart", protect, getChartData)
router.get("/dashboard/spending", protect, getSpendingByCategory)
router.get("/dashboard/savings", protect, getSavings)

export default router
