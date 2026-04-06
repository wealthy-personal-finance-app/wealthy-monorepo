import {
  Transaction,
  logger,
  successResponse,
  errorResponse,
} from "@wealthy/common"
import {CATEGORY_MAP} from "@wealthy/common/utils/categories.js"

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
    const userId = req.user.id;

    // 1. Start with a deep copy of the Official Map
    const mergedCategories = JSON.parse(JSON.stringify(CATEGORY_MAP));

    // 2. Find all custom transactions for this user
    const customTransactions = await Transaction.find({ 
      userId, 
      isCustom: true 
    }).select('type parentCategory subCategory').lean();

    // 3. Inject them into the map
    customTransactions.forEach(tx => {
      const { type, parentCategory, subCategory } = tx;

      // Check if the path exists (e.g., mergedCategories['expense']['Essential Living'])
      if (mergedCategories[type] && mergedCategories[type][parentCategory]) {
        
        // Add the subCategory if it's not already in the list
        if (!mergedCategories[type][parentCategory].includes(subCategory)) {
          mergedCategories[type][parentCategory].push(subCategory);
        }
      }
    });

    return successResponse(res, 200, "Nested categories retrieved", { 
        data: mergedCategories 
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to merge categories", error);
  }
};