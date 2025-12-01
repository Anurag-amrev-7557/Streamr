import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendRequests,
    getFriends,
    removeFriend
} from '../controllers/friendController.js';

const router = express.Router();

router.get('/search', protect, searchUsers);
router.post('/request/:userId', protect, sendFriendRequest);
router.put('/request/:requestId/accept', protect, acceptFriendRequest);
router.put('/request/:requestId/reject', protect, rejectFriendRequest);
router.get('/requests', protect, getFriendRequests);
router.get('/list', protect, getFriends);
router.delete('/:friendId', protect, removeFriend);

export default router;
