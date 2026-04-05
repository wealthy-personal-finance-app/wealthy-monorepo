import express from 'express';
import { addTransaction, deleteTransaction, getCategories, getTransactionById, getTransactions, updateTransaction } from '../controllers/transactionController.js';
import { protect } from '@wealthy/common/middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, addTransaction);
router.get('/', protect, getTransactions);
router.get('/categories', protect, getCategories);
router.get('/:id', protect, getTransactionById);
router.patch('/:id', protect, updateTransaction);
router.delete('/:id', protect, deleteTransaction);

export default router;