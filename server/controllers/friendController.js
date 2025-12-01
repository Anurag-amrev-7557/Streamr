import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

// @desc    Search users
// @route   GET /api/friends/search
// @access  Private
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        let searchCriteria = {
            _id: { $ne: req.user._id }
        };

        if (query) {
            searchCriteria.$or = [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ];
        }

        // Search by username or email, excluding current user
        const users = await User.find(searchCriteria)
            .select('name username email avatar')
            .limit(50); // Limit results to avoid overwhelming the frontend

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
export const sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot send friend request to yourself' });
        }

        const receiver = await User.findById(userId);
        if (!receiver) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already friends
        if (req.user.friends.includes(userId)) {
            return res.status(400).json({ message: 'You are already friends' });
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: req.user._id, receiver: userId },
                { sender: userId, receiver: req.user._id }
            ],
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already pending' });
        }

        const newRequest = new FriendRequest({
            sender: req.user._id,
            receiver: userId
        });

        await newRequest.save();

        res.status(201).json({ message: 'Friend request sent', request: newRequest });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Accept friend request
// @route   PUT /api/friends/request/:requestId/accept
// @access  Private
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to accept this request' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        request.status = 'accepted';
        await request.save();

        // Add to friends list for both users
        await User.findByIdAndUpdate(request.sender, {
            $addToSet: { friends: request.receiver }
        });

        await User.findByIdAndUpdate(request.receiver, {
            $addToSet: { friends: request.sender }
        });

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reject friend request
// @route   PUT /api/friends/request/:requestId/reject
// @access  Private
export const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to reject this request' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
export const getFriendRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: 'pending'
        }).populate('sender', 'name username avatar');

        res.json(requests);
    } catch (error) {
        console.error('Get friend requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all friends
// @route   GET /api/friends/list
// @access  Private
export const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends', 'name username avatar email');
        res.json(user.friends);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
// @access  Private
export const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { friends: friendId }
        });

        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: req.user._id }
        });

        // Also remove any accepted friend requests between them to keep data clean
        await FriendRequest.deleteMany({
            $or: [
                { sender: req.user._id, receiver: friendId },
                { sender: friendId, receiver: req.user._id }
            ],
            status: 'accepted'
        });

        res.json({ message: 'Friend removed' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
