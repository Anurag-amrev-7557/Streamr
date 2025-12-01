import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, UserCheck, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useFriendStore from '../store/useFriendStore';
import useAuthStore from '../store/useAuthStore';
import Navbar from '../components/Navbar';

const FriendsPage = () => {
    const [activeTab, setActiveTab] = useState('friends');
    const [searchQuery, setSearchQuery] = useState('');

    const {
        friends,
        requests,
        searchResults,
        isLoading,
        searchUsers,
        clearSearch,
        getFriends,
        getRequests,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend
    } = useFriendStore();

    const { user } = useAuthStore();

    useEffect(() => {
        getFriends();
        getRequests();
    }, [getFriends, getRequests]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            searchUsers(searchQuery);
        }
    };

    const tabVariants = {
        inactive: { opacity: 0.6, scale: 0.95 },
        active: { opacity: 1, scale: 1 }
    };

    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabRefs = React.useRef({});

    useEffect(() => {
        const activeElement = tabRefs.current[activeTab];
        if (activeElement) {
            setIndicatorStyle({
                left: activeElement.offsetLeft,
                width: activeElement.offsetWidth
            });
        }

        // Fetch all users when switching to 'add' tab if no search results yet
        if (activeTab === 'add' && searchResults.length === 0 && !searchQuery) {
            searchUsers('');
        }
    }, [activeTab]);

    const tabs = [
        { id: 'friends', icon: Users, label: 'Friends' },
        { id: 'add', icon: UserPlus, label: 'Add Friend' },
        { id: 'requests', icon: UserCheck, label: 'Requests', count: requests.length }
    ];

    const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-gradient-to-tr from-red-600/20 to-blue-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/5 p-6 rounded-full border border-white/10 shadow-2xl">
                    <Icon size={48} className="text-gray-400 group-hover:text-white transition-colors duration-300" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 max-w-md mb-8">{description}</p>
            {actionLabel && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAction}
                    className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
                >
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    );

    return (
        <div className="bg-black min-h-screen font-sans text-white overflow-x-hidden">
            <Navbar />

            <div className="pt-24 px-4 md:px-8 mx-auto pb-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6"
                >
                    <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-2 md:gap-3">
                        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Friends
                        </span>
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="text-gray-500 text-base md:text-xl font-normal"
                        >
                            ({friends.length})
                        </motion.span>
                    </h1>

                    <div className="relative flex items-center bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-white rounded-full"
                            initial={false}
                            animate={{
                                left: indicatorStyle.left,
                                width: indicatorStyle.width
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                ref={el => tabRefs.current[tab.id] = el}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative z-10 px-4 py-2 rounded-full flex items-center space-x-2 transition-colors duration-200 ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <tab.icon size={18} />
                                <span className="hidden md:inline font-medium">{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* My Friends Tab */}
                    {activeTab === 'friends' && (
                        <motion.div
                            key="friends"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {friends.length === 0 ? (
                                <div className="col-span-full">
                                    <EmptyState
                                        icon={Users}
                                        title="No friends yet"
                                        description="Connect with other users to see what they're watching and share your favorites."
                                        actionLabel="Find Friends"
                                        onAction={() => setActiveTab('add')}
                                    />
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <motion.div
                                        key={friend._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                        className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="relative">
                                                <img
                                                    src={friend.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                                    alt={friend.name}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-transparent group-hover:border-white/20 transition-all"
                                                />
                                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#121212] rounded-full"></div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{friend.name}</h3>
                                                <p className="text-sm text-gray-400">@{friend.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to remove this friend?')) {
                                                    removeFriend(friend._id);
                                                }
                                            }}
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove friend"
                                        >
                                            <X size={20} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* Add Friend Tab */}
                    {activeTab === 'add' && (
                        <motion.div
                            key="add"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="max-w-2xl mx-auto"
                        >
                            <form onSubmit={handleSearch} className="mb-10 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center bg-[#121212] border border-white/10 rounded-2xl p-2 focus-within:border-white/30 transition-colors">
                                    <Search className="ml-4 text-gray-400" size={24} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by username, email, or name..."
                                        className="w-full bg-transparent text-white px-4 py-3 text-lg focus:outline-none placeholder-gray-500"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-white text-black px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-3">
                                {searchResults.map((user, index) => (
                                    <motion.div
                                        key={user._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                                alt={user.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                            <div>
                                                <h3 className="font-semibold text-white">{user.name}</h3>
                                                <p className="text-sm text-gray-400">@{user.username}</p>
                                            </div>
                                        </div>
                                        {friends.some(f => f._id === user._id) ? (
                                            <span className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm font-medium flex items-center border border-green-500/20">
                                                <Check size={16} className="mr-1.5" /> Friends
                                            </span>
                                        ) : requests.some(r => r.sender._id === user._id || r.receiver === user._id) ? (
                                            <span className="px-4 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full text-sm font-medium border border-yellow-500/20">
                                                Pending
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => sendRequest(user._id)}
                                                className="px-4 py-1.5 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center"
                                            >
                                                <UserPlus size={16} className="mr-1.5" /> Add
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                                {searchResults.length === 0 && searchQuery && !isLoading && (
                                    <div className="py-12">
                                        <EmptyState
                                            icon={Search}
                                            title={`No results for "${searchQuery}"`}
                                            description="We couldn't find any users matching your search. Try a different username or email."
                                        />
                                    </div>
                                )}
                                {searchResults.length === 0 && !searchQuery && (
                                    <div className="py-12">
                                        <EmptyState
                                            icon={UserPlus}
                                            title="Find your friends"
                                            description="Search for people you know by their name, username, or email address to add them to your network."
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Requests Tab */}
                    {activeTab === 'requests' && (
                        <motion.div
                            key="requests"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="max-w-2xl mx-auto space-y-4"
                        >
                            {requests.length === 0 ? (
                                <EmptyState
                                    icon={UserCheck}
                                    title="No pending requests"
                                    description="You don't have any incoming friend requests at the moment. Why not send some yourself?"
                                    actionLabel="Find Friends"
                                    onAction={() => setActiveTab('add')}
                                />
                            ) : (
                                requests.map((request, index) => (
                                    <motion.div
                                        key={request._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:border-white/30 transition-all"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={request.sender.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                                alt={request.sender.name}
                                                className="w-14 h-14 rounded-full object-cover"
                                            />
                                            <div>
                                                <h3 className="font-bold text-white">{request.sender.name}</h3>
                                                <p className="text-sm text-gray-400">@{request.sender.username}</p>
                                                <p className="text-xs text-gray-500 mt-1">Sent you a friend request</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => acceptRequest(request._id)}
                                                className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                                                title="Accept"
                                            >
                                                <Check size={20} />
                                            </button>
                                            <button
                                                onClick={() => rejectRequest(request._id)}
                                                className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                title="Reject"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FriendsPage;

