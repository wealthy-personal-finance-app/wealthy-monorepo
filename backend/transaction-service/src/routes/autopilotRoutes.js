import express from 'express';
import { 
  createAutopilot, 
  getAutopilotFlows, 
  updateAutopilot, 
  deleteAutopilot,
  toggleAutopilotStatus
} from '../controllers/autopilotController.js';
import { protect } from '@wealthy/common/middleware/authMiddleware.js';

const router = express.Router();

// All autopilot routes are protected
router.use(protect);

// GET all flows for the user
router.get('/', getAutopilotFlows);

// POST create a new flow
router.post('/', createAutopilot);

// PATCH update a flow (Amount, Name, etc.)
router.patch('/:id', updateAutopilot);

// PATCH toggle active/inactive (The switch in your UI)
router.patch('/:id/toggle', toggleAutopilotStatus);

// DELETE a flow
router.delete('/:id', deleteAutopilot);

export default router;