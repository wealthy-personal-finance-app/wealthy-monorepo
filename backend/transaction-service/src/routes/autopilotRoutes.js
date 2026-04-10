// import express from 'express';
// import { 
//   createAutopilot, 
//   getAutopilotFlows, 
//   updateAutopilot, 
//   deleteAutopilot,
//   toggleAutopilotStatus
// } from '../controllers/autopilotController.js';
// import { protect } from '@wealthy/common/middleware/authMiddleware.js';

// const router = express.Router();

// // All autopilot routes are protected
// router.use(protect);

// // GET all flows for the user
// router.get('/', getAutopilotFlows);

// // POST create a new flow
// router.post('/', createAutopilot);

// // PATCH update a flow (Amount, Name, etc.)
// router.patch('/:id', updateAutopilot);

// // PATCH toggle active/inactive (The switch in your UI)
// router.patch('/:id/toggle', toggleAutopilotStatus);

// // DELETE a flow
// router.delete('/:id', deleteAutopilot);

// export default router;
import express from 'express';
import { 
  createAutopilot, 
  getAutopilotFlows, 
  updateAutopilot, 
  deleteAutopilot,
  toggleAutopilotStatus,
  getPendingFlows,
  logSingleFlow,
  logAllPendingFlows,
  skipSingleFlow,
  skipAllPendingFlows
} from '../controllers/autopilotController.js';
import { protect } from '@wealthy/common/middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// ===== CORE CRUD =====
router.get('/', getAutopilotFlows);
router.post('/', createAutopilot);
router.patch('/:id', updateAutopilot);
router.patch('/:id/toggle', toggleAutopilotStatus);
router.delete('/:id', deleteAutopilot);

// ===== PENDING =====
// ⚠️ These must come BEFORE /:id routes!
router.get('/pending', getPendingFlows);

// ===== LOG =====
router.post('/log-all', logAllPendingFlows);
router.post('/:id/log', logSingleFlow);

// ===== SKIP =====
router.post('/skip-all', skipAllPendingFlows);
router.post('/:id/skip', skipSingleFlow);

export default router;