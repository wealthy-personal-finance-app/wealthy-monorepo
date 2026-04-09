import { Transaction } from '@wealthy/common';

// ===== SUMMARY (Dashboard Cards) =====
export const getDashboardSummary = async (userId) => {

  const result = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Build summary object
  const summary = {
    income: 0,
    expense: 0,
    asset: 0,
    liability: 0
  };

  result.forEach(item => {
    summary[item._id] = item.total;
  });

  // Total Balance = Assets - Liabilities
  summary.totalBalance = summary.asset - summary.liability;

  // Net Flow = Income - Expense
  summary.netFlow = summary.income - summary.expense;

  return summary;
};

// ===== CHART DATA =====
export const getChartData = async (userId, type, period = 'month') => {

  const now = new Date();
  let startDate;

  // Set period
  if(period === 'week') {
    startDate = new Date(now.setDate(now.getDate() - 7));
  } else if(period === 'year') {
    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
  } else {
    // Default month
    startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate }
  };

  if(type && type !== 'balance') {
    match.type = type;
  }

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { 
            format: '%Y-%m-%d', 
            date: '$date' 
          }
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  return result;
};

// ===== SPENDING BY CATEGORY (Donut + Pie) =====
export const getSpendingByCategory = async (userId) => {

  const result = await Transaction.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense'
      } 
    },
    {
      $group: {
        _id: '$parentCategory',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  return result;
};

// ===== SAVINGS (My Saving Section) =====
export const getSavings = async (userId) => {

  const result = await Transaction.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        type: 'asset'
      } 
    },
    {
      $group: {
        _id: '$subCategory',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  return result;
};