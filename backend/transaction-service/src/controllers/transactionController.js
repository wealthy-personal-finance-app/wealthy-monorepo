import mongoose from "mongoose"
import {
  Transaction,
  logger,
  successResponse,
  errorResponse,
} from "@wealthy/common"
import {CATEGORY_MAP} from "@wealthy/common/utils/categories.js"
import CustomCategory from "../models/CustomCategory.js"

const log = logger.child({service: "TRANSACTION-SERVICE"})

export const addTransaction = async (req, res) => {
  try {
    const {amount, type, parentCategory, subCategory, date, note} = req.body

    const isOfficial =
      CATEGORY_MAP[type]?.[parentCategory]?.includes(subCategory)

    const transaction = new Transaction({
      userId: req.user.id,
      amount,
      type,
      parentCategory,
      subCategory,
      isCustom: !isOfficial,
      date,
      note,
    })

    await transaction.save()

    log.info(`Transaction created: ${transaction._id}`)

    return successResponse(res, 201, "Transaction added successfully", {
      data: transaction,
    })
  } catch (error) {
    log.error("Failed to add transaction", {error: error.message})

    return errorResponse(res, 500, "Internal Server Error", error)
  }
}

export const getTransactionById = async (req, res) => {
  try {
    const {id} = req.params
    const userId = req.user.id

    const transaction = await Transaction.findOne({_id: id, userId}).lean()

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found")
    }

    return successResponse(res, 200, "Transaction retrieved", {
      data: transaction,
    })
  } catch (error) {
    logger.error("Error fetching single transaction", {error: error.message})
    return errorResponse(res, 500, "Invalid ID format or Server Error", error)
  }
}

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id

    const {
      id,
      type,
      parentCategory,
      subCategory,
      startDate,
      endDate,
      aggregate,
      groupBy,
      sort = "desc",
    } = req.query

    const match = {userId}

    if (type) match.type = type.toLowerCase()
    if (parentCategory) match.parentCategory = parentCategory
    if (subCategory) match.subCategory = subCategory

    if (startDate || endDate) {
      match.date = {}
      if (startDate) match.date.$gte = new Date(startDate)
      if (endDate) match.date.$lte = new Date(endDate)
    }

    if (aggregate === "total") {
      const result = await Transaction.aggregate([
        {$match: match},
        {
          $group: {
            _id: null,
            totalAmount: {$sum: "$amount"},
            count: {$sum: 1},
          },
        },
      ])

      const data = result[0] || {totalAmount: 0, count: 0}
      return successResponse(res, 200, "Aggregate total calculated", {data})
    }

    if (groupBy) {
      const result = await Transaction.aggregate([
        {$match: match},
        {
          $group: {
            _id: `$${groupBy}`, // Dynamic grouping by 'type', 'parentCategory', etc.
            totalAmount: {$sum: "$amount"},
            transactionCount: {$sum: 1},
          },
        },
        {$sort: {totalAmount: -1}},
      ])

      return successResponse(res, 200, `Transactions grouped by ${groupBy}`, {
        data: result,
      })
    }

    const transactions = await Transaction.find(match)
      .sort({date: sort === "asc" ? 1 : -1})
      .lean()

    logger.info(
      `Fetched ${transactions.length} transactions for user ${userId}`
    )

    return successResponse(res, 200, "Transactions retrieved successfully", {
      count: transactions.length,
      data: transactions,
    })
  } catch (error) {
    log.error("Error fetching transactions", {error: error.message})
    return errorResponse(res, 500, "Failed to fetch transactions", error)
  }
}

export const updateTransaction = async (req, res) => {
  try {
    const {id} = req.params
    const userId = req.user.id
    const updates = req.body

    const existingTx = await Transaction.findOne({_id: id, userId})
    if (!existingTx) return errorResponse(res, 404, "Transaction not found")

    const finalType = updates.type || existingTx.type
    const finalMaster = updates.parentCategory || existingTx.parentCategory
    const finalSub = updates.subCategory || existingTx.subCategory

    const validMasters = Object.keys(CATEGORY_MAP[finalType] || {})

    if (!validMasters.includes(finalMaster)) {
      return errorResponse(
        res,
        400,
        `Invalid Category: '${finalMaster}' does not belong to '${finalType}'`
      )
    }

    updates.isCustom = !CATEGORY_MAP[finalType][finalMaster].includes(finalSub)

    const updatedTx = await Transaction.findByIdAndUpdate(
      id,
      {$set: updates},
      {new: true, runValidators: true}
    )

    return successResponse(res, 200, "Update successful", {data: updatedTx})
  } catch (error) {
    return errorResponse(res, 500, "Update failed", error)
  }
}

export const deleteTransaction = async (req, res) => {
  try {
    const {id} = req.params
    const userId = req.user.id

    const result = await Transaction.findOneAndDelete({_id: id, userId})

    if (!result) return errorResponse(res, 404, "Transaction not found")

    return successResponse(res, 200, "Transaction deleted successfully")
  } catch (error) {
    return errorResponse(res, 500, "Deletion failed", error)
  }
}

export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id

    const mergedCategories = JSON.parse(JSON.stringify(CATEGORY_MAP))

    const [customTransactions, persistedCustomCategories] = await Promise.all([
      Transaction.find({
        userId,
        isCustom: true,
      })
        .select("type parentCategory subCategory")
        .lean(),
      CustomCategory.find({userId})
        .select("type parentCategory subCategory")
        .lean(),
    ])

    const injectCategory = ({type, parentCategory, subCategory}) => {
      if (!type || !parentCategory || !subCategory) return

      if (!mergedCategories[type]) {
        mergedCategories[type] = {}
      }

      if (!Array.isArray(mergedCategories[type][parentCategory])) {
        mergedCategories[type][parentCategory] = []
      }

      if (!mergedCategories[type][parentCategory].includes(subCategory)) {
        mergedCategories[type][parentCategory].push(subCategory)
      }
    }

    customTransactions.forEach(injectCategory)
    persistedCustomCategories.forEach(injectCategory)

    return successResponse(res, 200, "Nested categories retrieved", {
      data: mergedCategories,
    })
  } catch (error) {
    return errorResponse(res, 500, "Failed to merge categories", error)
  }
}

export const createCategory = async (req, res) => {
  try {
    const userId = req.user.id
    const {type, parentCategory, subCategory} = req.body

    if (!type || !parentCategory || !subCategory) {
      return errorResponse(
        res,
        400,
        "type, parentCategory, and subCategory are required"
      )
    }

    const normalizedType = String(type).trim().toLowerCase()
    const normalizedParent = String(parentCategory).trim()
    const normalizedSub = String(subCategory).trim()

    if (!CATEGORY_MAP[normalizedType]) {
      return errorResponse(
        res,
        400,
        "Invalid type. Use expense, income, asset, or liability"
      )
    }

    const customCategory = await CustomCategory.findOneAndUpdate(
      {
        userId,
        type: normalizedType,
        parentCategory: normalizedParent,
        subCategory: normalizedSub,
      },
      {
        $setOnInsert: {
          userId,
          type: normalizedType,
          parentCategory: normalizedParent,
          subCategory: normalizedSub,
        },
      },
      {upsert: true, new: true}
    ).lean()

    return successResponse(res, 201, "Category created", {
      data: customCategory,
    })
  } catch (error) {
    return errorResponse(res, 500, "Failed to create category", error)
  }
}

// ===== DASHBOARD SUMMARY =====
export const getDashboardSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const result = await Transaction.aggregate([
      {$match: {userId}},
      {
        $group: {
          _id: "$type",
          total: {$sum: "$amount"},
        },
      },
    ])

    const summary = {income: 0, expense: 0, asset: 0, liability: 0}
    result.forEach((item) => {
      summary[item._id] = item.total
    })
    summary.totalBalance = summary.asset - summary.liability
    summary.netFlow = summary.income - summary.expense

    log.info(`Dashboard summary fetched for user ${req.user.id}`)
    return successResponse(res, 200, "Dashboard summary", {data: summary})
  } catch (error) {
    log.error("Failed to get dashboard summary", {error: error.message})
    return errorResponse(res, 500, "Failed to get dashboard summary", error)
  }
}

export const getChartData = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const {type, startDate: start, endDate: end} = req.query

    if (!start || !end) {
      return errorResponse(res, 400, "startDate and endDate are required")
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    // ===== HELPER: Generate ALL dates in range =====
    const generateAllDates = (start, end) => {
      const dates = []
      const cur = new Date(start)
      cur.setHours(0, 0, 0, 0)
      const last = new Date(end)
      last.setHours(23, 59, 59, 999)
      while (cur <= last) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, "0")
        const d = String(cur.getDate()).padStart(2, "0")
        dates.push(`${y}-${m}-${d}`)
        cur.setDate(cur.getDate() + 1)
      }
      return dates
    }

    // ===== BALANCE CHART =====
    if (!type || type === "balance") {
      const result = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: {$gte: startDate, $lte: endDate},
            type: {$in: ["asset", "liability"]},
          },
        },
        {
          $group: {
            _id: {
              date: {$dateToString: {format: "%Y-%m-%d", date: "$date"}},
              type: "$type",
            },
            total: {$sum: "$amount"},
          },
        },
        {
          $group: {
            _id: "$_id.date",
            asset: {
              $sum: {$cond: [{$eq: ["$_id.type", "asset"]}, "$total", 0]},
            },
            liability: {
              $sum: {$cond: [{$eq: ["$_id.type", "liability"]}, "$total", 0]},
            },
          },
        },
        {$project: {_id: 1, total: {$subtract: ["$asset", "$liability"]}}},
        {$sort: {_id: 1}},
      ])

      // Fill missing dates with 0
      const dataMap = {}
      result.forEach((r) => {
        dataMap[r._id] = r.total
      })
      const allDates = generateAllDates(startDate, endDate)
      const filled = allDates.map((d) => ({_id: d, total: dataMap[d] || 0}))

      return successResponse(res, 200, "Balance chart data", {data: filled})
    }

    // ===== INCOME / EXPENSE CHART =====
    const result = await Transaction.aggregate([
      {$match: {userId, date: {$gte: startDate, $lte: endDate}, type}},
      {
        $group: {
          _id: {$dateToString: {format: "%Y-%m-%d", date: "$date"}},
          total: {$sum: "$amount"},
          count: {$sum: 1},
        },
      },
      {$sort: {_id: 1}},
    ])

    // Fill missing dates with 0
    const dataMap = {}
    result.forEach((r) => {
      dataMap[r._id] = r.total
    })
    const allDates = generateAllDates(startDate, endDate)
    const filled = allDates.map((d) => ({_id: d, total: dataMap[d] || 0}))

    return successResponse(res, 200, "Chart data", {data: filled})
  } catch (error) {
    log.error("Failed to get chart data", {error: error.message})
    return errorResponse(res, 500, "Failed to get chart data", error)
  }
}
// ===== SPENDING BY CATEGORY (Donut + Pie) =====
export const getSpendingByCategory = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const result = await Transaction.aggregate([
      {$match: {userId, type: "expense"}},
      {
        $group: {
          _id: "$parentCategory",
          total: {$sum: "$amount"},
          count: {$sum: 1},
        },
      },
      {$sort: {total: -1}},
    ])

    log.info(`Spending by category fetched for user ${req.user.id}`)
    return successResponse(res, 200, "Spending by category", {data: result})
  } catch (error) {
    log.error("Failed to get spending by category", {error: error.message})
    return errorResponse(res, 500, "Failed to get spending by category", error)
  }
}

// ===== SAVINGS =====
export const getSavings = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const result = await Transaction.aggregate([
      {$match: {userId, type: "asset"}},
      {
        $group: {
          _id: "$subCategory",
          total: {$sum: "$amount"},
          count: {$sum: 1},
        },
      },
      {$sort: {total: -1}},
    ])

    log.info(`Savings fetched for user ${req.user.id}`)
    return successResponse(res, 200, "Savings data", {data: result})
  } catch (error) {
    log.error("Failed to get savings", {error: error.message})
    return errorResponse(res, 500, "Failed to get savings", error)
  }
}
