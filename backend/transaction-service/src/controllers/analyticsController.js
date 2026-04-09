import mongoose from 'mongoose';
import { Transaction, logger, successResponse, errorResponse } from '@wealthy/common';

const log = logger.child({ service: 'TRANSACTION-SERVICE' });

export const getSankeyData = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { view = 'monthly', month, year } = req.query;

    // ===== BUILD DATE RANGES =====
    let flowStart, flowEnd, assetEnd;

    if(view === 'yearly') {
      const yr = parseInt(year) || new Date().getFullYear();
      flowStart = new Date(`${yr}-01-01T00:00:00.000Z`);
      flowEnd   = new Date(`${yr}-12-31T23:59:59.999Z`);
      assetEnd  = flowEnd;
    } else {
      // monthly (default)
      const target = month
        ? new Date(month + '-01T00:00:00.000Z')
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      flowStart = target;
      flowEnd   = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0, 23, 59, 59, 999
      );
      assetEnd  = flowEnd;
    }

    log.info(`Sankey: userId=${req.user.id} view=${view} start=${flowStart} end=${flowEnd}`);

    // ===== FETCH INCOME (filtered by period) =====
    const incomeData = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'income',
          date: { $gte: flowStart, $lte: flowEnd }
        }
      },
      {
        $group: {
          _id: '$subCategory',
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    // ===== FETCH EXPENSES (filtered by period) =====
    const expenseData = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: flowStart, $lte: flowEnd }
        }
      },
      {
        $group: {
          _id: '$subCategory',
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    // ===== FETCH ASSETS (all time up to period end) =====
    const assetData = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'asset',
          date: { $lte: assetEnd }
        }
      },
      {
        $group: {
          _id: '$subCategory',
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    // ===== FETCH LIABILITIES (all time up to period end) =====
    const liabilityData = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'liability',
          date: { $lte: assetEnd }
        }
      },
      {
        $group: {
          _id: '$subCategory',
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    // ===== CALCULATE TOTALS =====
    const totalInflow     = incomeData.reduce((a, d) => a + d.value, 0);
    const totalAssets     = assetData.reduce((a, d) => a + d.value, 0);
    const totalExpenses   = expenseData.reduce((a, d) => a + d.value, 0);
    const totalLiabilities = liabilityData.reduce((a, d) => a + d.value, 0);
    const netWorth        = totalAssets - totalLiabilities;

    // If no data return empty
    if(totalInflow === 0 && totalAssets === 0) {
      return successResponse(res, 200, 'No data for this period', {
        data: { nodes: [], links: [], summary: { totalInflow: 0, netWorth: 0, totalAssets: 0, totalExpenses: 0, totalLiabilities: 0 } }
      });
    }

    // ===== BUILD NODES =====
    const nodes = [];

    // Income source nodes (left side)
    incomeData.forEach(d => {
      nodes.push({ id: `income_${d._id}`, name: d._id, value: d.value, type: 'income' });
    });

    // Middle nodes
    nodes.push({ id: 'totalInflow', name: 'Total Inflow', value: totalInflow, type: 'inflow' });
    nodes.push({ id: 'netWorth',    name: 'Net Worth',    value: netWorth,    type: 'networth' });

    // Category nodes
    if(totalAssets > 0)      nodes.push({ id: 'assets',      name: 'Assets',      value: totalAssets,      type: 'assets' });
    if(totalExpenses > 0)    nodes.push({ id: 'expenses',    name: 'Expenses',    value: totalExpenses,    type: 'expenses' });
    if(totalLiabilities > 0) nodes.push({ id: 'liabilities', name: 'Liabilities', value: totalLiabilities, type: 'liabilities' });

    // Sub-category nodes (right side)
    assetData.forEach(d => {
      nodes.push({ id: `asset_${d._id}`, name: d._id, value: d.value, type: 'asset_item' });
    });
    expenseData.forEach(d => {
      nodes.push({ id: `expense_${d._id}`, name: d._id, value: d.value, type: 'expense_item' });
    });
    liabilityData.forEach(d => {
      nodes.push({ id: `liability_${d._id}`, name: d._id, value: d.value, type: 'liability_item' });
    });

    // ===== BUILD LINKS =====
    const links = [];

    // Income sources → Total Inflow
    incomeData.forEach(d => {
      links.push({ source: `income_${d._id}`, target: 'totalInflow', value: d.value });
    });

    // Total Inflow → Net Worth
    links.push({ source: 'totalInflow', target: 'netWorth', value: totalInflow });

    // Net Worth → Categories
    if(totalAssets > 0)
      links.push({ source: 'netWorth', target: 'assets', value: totalAssets });
    if(totalExpenses > 0)
      links.push({ source: 'netWorth', target: 'expenses', value: totalExpenses });
    if(totalLiabilities > 0)
      links.push({ source: 'netWorth', target: 'liabilities', value: totalLiabilities });

    // Assets → Sub categories
    assetData.forEach(d => {
      links.push({ source: 'assets', target: `asset_${d._id}`, value: d.value });
    });

    // Expenses → Sub categories
    expenseData.forEach(d => {
      links.push({ source: 'expenses', target: `expense_${d._id}`, value: d.value });
    });

    // Liabilities → Sub categories
    liabilityData.forEach(d => {
      links.push({ source: 'liabilities', target: `liability_${d._id}`, value: d.value });
    });

    // ===== SUMMARY =====
    const summary = {
      totalInflow,
      netWorth,
      totalAssets,
      totalExpenses,
      totalLiabilities,
      period: { view, start: flowStart, end: flowEnd }
    };

    log.info(`Sankey built: ${nodes.length} nodes, ${links.length} links`);

    return successResponse(res, 200, 'Sankey data fetched', {
      data: { nodes, links, summary }
    });

  } catch (error) {
    log.error('Failed to get Sankey data', { error: error.message });
    return errorResponse(res, 500, 'Failed to get Sankey data', error);
  }
};