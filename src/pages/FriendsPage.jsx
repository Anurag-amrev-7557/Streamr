import React, { useState, useEffect, memo } from 'react';
import { Search, UserPlus, Users, UserCheck, X, Check, MessageSquare, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useFriendStore from '../store/useFriendStore';
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';
import Navbar from '../components/Navbar';

// Memoized Right Column Component (Friends & Requests Summary)
const RightColumn = memo(({ requests, friends, acceptRequest, rejectRequest, setActiveTab }) => {
    return (
        <div className="space-y-8 hidden lg:block">
            {/* Pending Requests Section */}
            {requests.length > 0 && (
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                        Pending Requests
                        <span className="bg-white text-black text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
                    </div>
                    <div className="space-y-1">
                        {requests.slice(0, 3).map((request) => (
                            <div key={request._id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={request.sender.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                        alt={request.sender.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-white truncate max-w-[100px] text-sm">{request.sender.name}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => acceptRequest(request._id)}
                                        className="p-1.5 rounded-full hover:bg-green-500/20 text-green-400 transition-colors"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        onClick={() => rejectRequest(request._id)}
                                        className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {requests.length > 3 && (
                            <button
                                onClick={() => setActiveTab('requests')}
                                className="text-xs text-gray-500 hover:text-white mt-2 pl-2 transition-colors"
                            >
                                + {requests.length - 3} more requests
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Your Friends Summary */}
            <div>
                <div className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                    Your Friends
                    <span className="bg-white/10 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full">{friends.length}</span>
                </div>
                {friends.length === 0 ? (
                    <p className="text-gray-500 text-sm pl-2">No friends yet.</p>
                ) : (
                    <div className="space-y-1">
                        {friends.slice(0, 5).map((friend) => (
                            <div key={friend._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" onClick={() => setActiveTab('friends')}>
                                <div className="relative">
                                    <img
                                        src={friend.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                        alt={friend.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-black rounded-full"></div>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-medium text-white truncate text-sm">{friend.name}</p>
                                    <p className="text-[10px] text-gray-500 truncate">@{friend.username}</p>
                                </div>
                            </div>
                        ))}
                        {friends.length > 5 && (
                            <button
                                onClick={() => setActiveTab('friends')}
                                className="text-xs text-gray-500 hover:text-white mt-2 pl-2 transition-colors"
                            >
                                View all friends
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// Memoized Search Results Component
const SearchResultsList = memo(({ searchResults, friends, requests, sendRequest, searchQuery, isLoading }) => {
    return (
        <div className="space-y-3 mt-6">
            {isLoading ? (
                <div className="space-y-3">
                    <SearchSkeleton />
                    <SearchSkeleton />
                </div>
            ) : (
                <>
                    {searchResults.length > 0 && (
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                            Results
                        </div>
                    )}
                    {searchResults.map((user) => (
                        <motion.div
                            key={user._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <img
                                    src={user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-medium text-white text-sm">{user.name}</h3>
                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                </div>
                            </div>
                            {friends.some(f => f._id === user._id) ? (
                                <span className="text-green-400 text-xs font-medium flex items-center gap-1.5">
                                    <Check size={14} /> Friends
                                </span>
                            ) : requests.some(r => r.sender._id === user._id || r.receiver === user._id) ? (
                                <span className="text-yellow-400 text-xs font-medium">
                                    Pending
                                </span>
                            ) : (
                                <button
                                    onClick={() => sendRequest(user._id)}
                                    className="p-2 rounded-full bg-white/5 text-white hover:bg-white hover:text-black transition-all"
                                    title="Add Friend"
                                >
                                    <UserPlus size={18} />
                                </button>
                            )}
                        </motion.div>
                    ))}
                    {searchResults.length === 0 && searchQuery && !isLoading && (
                        <EmptyState
                            icon={Search}
                            title="No results found"
                            description={`We couldn't find anyone matching "${searchQuery}".`}
                        />
                    )}
                    {searchResults.length === 0 && !searchQuery && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 opacity-40">
                            <Users className="w-16 h-16 mb-4 text-gray-500" />
                            <p className="text-gray-500 font-medium">Search for friends to add them</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

const FriendsPage = () => {
    const [activeTab, setActiveTab] = useState('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('all'); // 'all', 'new'
    const [searchSort, setSearchSort] = useState('relevance'); // 'relevance', 'asc', 'desc'
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const {
        friends,
        requests,
        searchResults,
        isLoading,
        searchUsers,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        getFriends,
        getRequests
    } = useFriendStore();
    const { user } = useAuthStore();

    // Toggler Logic
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabRefs = React.useRef({});

    useEffect(() => {
        getFriends();
        getRequests();
    }, [getFriends, getRequests]);

    useEffect(() => {
        const activeElement = tabRefs.current[activeTab];
        if (activeElement) {
            setIndicatorStyle({
                left: activeElement.offsetLeft,
                width: activeElement.offsetWidth
            });
        }
    }, [activeTab]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                searchUsers(searchQuery);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) searchUsers(searchQuery);
    };

    const clearSearchInput = () => setSearchQuery('');

    // Local loading state to prevent flash
    const [isMounting, setIsMounting] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setIsMounting(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // Filter and Sort Logic
    const filteredAndSortedResults = React.useMemo(() => {
        let results = [...searchResults];

        // Filter
        if (searchFilter === 'new') {
            results = results.filter(user => {
                const isFriend = friends.some(f => f._id === user._id);
                const isPending = requests.some(r => r.sender._id === user._id || r.receiver === user._id);
                return !isFriend && !isPending;
            });
        }

        // Sort
        if (searchSort === 'asc') {
            results.sort((a, b) => a.name.localeCompare(b.name));
        } else if (searchSort === 'desc') {
            results.sort((a, b) => b.name.localeCompare(a.name));
        }

        return results;
    }, [searchResults, searchFilter, searchSort, friends, requests]);

    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const tabs = [
        { id: 'friends', label: 'All Friends' },
        { id: 'requests', label: 'Pending', count: requests.length },
        { id: 'add', label: 'Add Friend' },
    ];

    return (
        <div className="bg-black min-h-screen font-sans text-white overflow-x-hidden flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col pt-24 px-4 md:px-8 pb-10">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6  mx-auto w-full"
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

                    {/* Sliding Pill Toggler */}
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
                                className={`relative z-10 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="flex-1 mx-auto w-full">
                    <AnimatePresence mode="wait">
                        {/* All Friends Tab (List View) */}
                        {activeTab === 'friends' && (
                            <motion.div
                                key="friends"
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="h-full"
                            >
                                {isLoading || isMounting ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <SearchSkeleton key={i} />
                                        ))}
                                    </div>
                                ) : friends.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="No friends yet"
                                        description="Connect with other users to see what they're watching and share your favorites."
                                        actionLabel="Find Friends"
                                        onAction={() => setActiveTab('add')}
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {friends.map(friend => (
                                            <motion.div
                                                key={friend._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="group relative flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden"
                                            >
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={friend.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                                        alt={friend.name}
                                                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                                                    />
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-white text-base truncate">
                                                        {friend.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 truncate">@{friend.username}</p>
                                                </div>

                                                {/* Hover Actions Overlay */}
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openChat(friend);
                                                        }}
                                                        className="p-2 rounded-full bg-white text-black hover:scale-110 transition-transform"
                                                        title="Message"
                                                    >
                                                        <MessageSquare size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Remove this friend?')) removeFriend(friend._id);
                                                        }}
                                                        className="p-2 rounded-full bg-red-500 text-white hover:scale-110 transition-transform"
                                                        title="Remove"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Pending Requests Tab (List View) */}
                        {activeTab === 'requests' && (
                            <motion.div
                                key="requests"
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="h-full"
                            >
                                {isLoading || isMounting ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <SearchSkeleton key={i} />
                                        ))}
                                    </div>
                                ) : requests.length === 0 ? (
                                    <EmptyState
                                        icon={UserCheck}
                                        title="No pending requests"
                                        description="You're all caught up! No one is waiting."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {requests.map((request) => (
                                            <motion.div
                                                key={request._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={request.sender.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                                        alt={request.sender.name}
                                                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                                                    />
                                                    <div>
                                                        <h3 className="font-bold text-white text-base">{request.sender.name}</h3>
                                                        <p className="text-sm text-gray-400">Incoming Friend Request</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => acceptRequest(request._id)}
                                                        className="p-2.5 rounded-full bg-white/10 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                                                        title="Accept"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectRequest(request._id)}
                                                        className="p-2.5 rounded-full bg-white/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                        title="Reject"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Add Friend Tab (2-Column Layout) */}
                        {activeTab === 'add' && (
                            <motion.div
                                key="add"
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="h-full"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                                    {/* Left Column: Search & Results */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                                            Find People
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <form onSubmit={handleSearch} className="relative group flex-1">
                                                <div className="relative flex items-center bg-white/5 border border-white/20 rounded-full px-2 focus-within:border-white/10 focus-within:bg-white/10 transition-all duration-300">
                                                    <Search className="ml-3 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Search by username..."
                                                        className="w-full bg-transparent text-white px-3 py-3 text-sm focus:outline-none placeholder-gray-600"
                                                        autoFocus
                                                    />
                                                    {searchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={clearSearchInput}
                                                            className="mr-1 p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </form>

                                            {/* Filter & Sort Controls */}
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => {
                                                            setShowFilterMenu(!showFilterMenu);
                                                            setShowSortMenu(false);
                                                        }}
                                                        className={`p-3 rounded-full border transition-all ${searchFilter !== 'all'
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        title="Filter Results"
                                                    >
                                                        <Filter size={18} />
                                                    </button>
                                                    {showFilterMenu && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-[#121212] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                                                            <button
                                                                onClick={() => { setSearchFilter('all'); setShowFilterMenu(false); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                                                            >
                                                                <span className={searchFilter === 'all' ? 'text-white' : 'text-gray-400 group-hover:text-white'}>All Results</span>
                                                                {searchFilter === 'all' && <Check size={14} className="text-white" />}
                                                            </button>
                                                            <button
                                                                onClick={() => { setSearchFilter('new'); setShowFilterMenu(false); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                                                            >
                                                                <span className={searchFilter === 'new' ? 'text-white' : 'text-gray-400 group-hover:text-white'}>New People Only</span>
                                                                {searchFilter === 'new' && <Check size={14} className="text-white" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => {
                                                            setShowSortMenu(!showSortMenu);
                                                            setShowFilterMenu(false);
                                                        }}
                                                        className={`p-3 rounded-full border transition-all ${searchSort !== 'relevance'
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        title="Sort Results"
                                                    >
                                                        <ArrowUpDown size={18} />
                                                    </button>
                                                    {showSortMenu && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-[#121212] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                                                            <button
                                                                onClick={() => { setSearchSort('relevance'); setShowSortMenu(false); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                                                            >
                                                                <span className={searchSort === 'relevance' ? 'text-white' : 'text-gray-400 group-hover:text-white'}>Relevance</span>
                                                                {searchSort === 'relevance' && <Check size={14} className="text-white" />}
                                                            </button>
                                                            <button
                                                                onClick={() => { setSearchSort('asc'); setShowSortMenu(false); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                                                            >
                                                                <span className={searchSort === 'asc' ? 'text-white' : 'text-gray-400 group-hover:text-white'}>Name (A-Z)</span>
                                                                {searchSort === 'asc' && <Check size={14} className="text-white" />}
                                                            </button>
                                                            <button
                                                                onClick={() => { setSearchSort('desc'); setShowSortMenu(false); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                                                            >
                                                                <span className={searchSort === 'desc' ? 'text-white' : 'text-gray-400 group-hover:text-white'}>Name (Z-A)</span>
                                                                {searchSort === 'desc' && <Check size={14} className="text-white" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <SearchResultsList
                                            searchResults={filteredAndSortedResults}
                                            friends={friends}
                                            requests={requests}
                                            sendRequest={sendRequest}
                                            searchQuery={searchQuery}
                                            isLoading={isLoading}
                                        />
                                    </div>

                                    {/* Right Column: Requests & Friends Summary */}
                                    <RightColumn
                                        requests={requests}
                                        friends={friends}
                                        acceptRequest={acceptRequest}
                                        rejectRequest={rejectRequest}
                                        setActiveTab={setActiveTab}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const SearchSkeleton = () => (
    <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between animate-pulse border border-white/5">
        <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-white/10" />
            <div className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
        </div>
        <div className="w-20 h-8 bg-white/10 rounded-full" />
    </div>
);

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center py-20 text-center h-full"
    >
        <div className="relative mb-6">
            <div className="relative bg-white/5 p-6 rounded-full border border-white/10 shadow-xl">
                <Icon size={48} className="text-gray-400" />
            </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 max-w-md mb-6">{description}</p>
        {actionLabel && (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAction}
                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
            >
                {actionLabel}
            </motion.button>
        )}
    </motion.div>
);

export default FriendsPage;
