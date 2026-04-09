import express from 'express';
import { protect } from '@wealthy/common/middleware/authMiddleware.js';
import { getSankeyData } from '../controllers/analyticsController.js';

const router = express.Router();

// ===== SANKEY =====
// GET /api/analytics/sankey?view=monthly&month=2026-04
// GET /api/analytics/sankey?view=yearly&year=2026
router.get('/sankey', protect, getSankeyData);

export default router;