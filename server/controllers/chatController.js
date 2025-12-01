import Message from '../models/Message.js';

// @desc    Get conversation between current user and another user
// @route   GET /api/chat/:userId
// @access  Private
export const getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userId },
                { sender: userId, receiver: myId }
            ]
        })
            .sort({ createdAt: 1 }); // Oldest first

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
