import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMessages } from '../controllers/chatController.js';

const router = express.Router();

router.get('/:userId', protect, getMessages);

export default router;
