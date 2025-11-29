import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../lib/api';

const AVATARS = [
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-0w1zdaydn9w9e38t.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v3t27956d030i4b9.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-dyrp6bw6adqg9841.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-243ap64p6l607sp3.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-6213552203548356.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-w3lyr698co023268.jpg'
];

const ProfileSelection = () => {
    const { user, selectProfile, checkAuth } = useAuthStore();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleProfileSelect = async (profileId) => {
        if (isEditing) return;

        setIsLoading(true);
        const success = await selectProfile(profileId);
        if (success) {
            navigate('/');
        }
        setIsLoading(false);
    };

    const handleAddProfile = async (e) => {
        e.preventDefault();
        if (!newProfileName.trim()) return;

        try {
            await api.post('/auth/profiles', {
                name: newProfileName,
                avatar: selectedAvatar
            });

            // Refresh user data to get new profile
            await checkAuth();

            setShowAddModal(false);
            setNewProfileName('');
            setSelectedAvatar(AVATARS[0]);
        } catch (error) {
            console.error('Failed to create profile:', error);
        }
    };

    const handleDeleteProfile = async (profileId, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this profile? This cannot be undone.')) {
            try {
                await api.delete(`/auth/profiles/${profileId}`);
                await checkAuth();
            } catch (error) {
                console.error('Failed to delete profile:', error);
                alert(error.response?.data?.message || 'Failed to delete profile');
            }
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center p-4 animate-in fade-in duration-700">
            {/* Logo */}
            <div className="absolute top-8 left-8">
                <svg
                    width="100"
                    height="30"
                    viewBox="0 0 111 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#E50914]"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M65.6101 0.000195503L64.2194 29.8967H72.8287L74.2194 0.000195503H65.6101ZM89.1096 0.000195503L87.7189 29.8967H96.3282L97.7189 0.000195503H89.1096ZM0 0.000195503L8.60927 29.8967H17.2185L22.957 9.96553L21.5663 29.8967H30.1755L21.5663 0.000195503H12.957L7.21854 19.9314L8.60927 0.000195503H0ZM46.9205 0.000195503L45.5298 29.8967H62.751L64.1417 0.000195503H46.9205ZM107.719 0.000195503L102.156 14.9485L110.765 29.8967H100.765L96.3282 19.9314L94.9374 29.8967H86.3282L92.0666 14.9485L83.4573 0.000195503H93.4573L97.7189 9.96553L99.1096 0.000195503H107.719ZM34.7219 0.000195503L33.3311 29.8967H41.9404L43.3311 0.000195503H34.7219Z"
                        fill="currentColor"
                    />
                </svg>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-white mb-8 md:mb-12 tracking-wide">
                Who's watching?
            </h1>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8 max-w-5xl">
                <AnimatePresence>
                    {user.profiles?.map((profile) => (
                        <motion.div
                            key={profile._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            className="group relative flex flex-col items-center gap-3 cursor-pointer"
                            onClick={() => handleProfileSelect(profile._id)}
                        >
                            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden border-2 border-transparent group-hover:border-white transition-all duration-200">
                                <img
                                    src={profile.avatar}
                                    alt={profile.name}
                                    className="w-full h-full object-cover"
                                />
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Edit2 className="w-8 h-8 text-white" />
                                    </div>
                                )}
                                {isEditing && user.profiles.length > 1 && (
                                    <button
                                        onClick={(e) => handleDeleteProfile(profile._id, e)}
                                        className="absolute top-1 right-1 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>
                                )}
                            </div>
                            <span className="text-gray-400 group-hover:text-white text-lg md:text-xl transition-colors duration-200">
                                {profile.name}
                            </span>
                        </motion.div>
                    ))}

                    {/* Add Profile Button */}
                    {(!user.profiles || user.profiles.length < 5) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            className="group flex flex-col items-center gap-3 cursor-pointer"
                            onClick={() => !isEditing && setShowAddModal(true)}
                        >
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-md flex items-center justify-center bg-[#141414] border-2 border-gray-400 group-hover:border-white group-hover:bg-white transition-all duration-200">
                                <Plus className="w-12 h-12 text-gray-400 group-hover:text-black transition-colors duration-200" />
                            </div>
                            <span className="text-gray-400 group-hover:text-white text-lg md:text-xl transition-colors duration-200">
                                Add Profile
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <button
                onClick={() => setIsEditing(!isEditing)}
                className="mt-12 px-8 py-2 border border-gray-400 text-gray-400 hover:text-white hover:border-white tracking-widest uppercase text-sm md:text-base transition-all duration-200"
            >
                {isEditing ? 'Done' : 'Manage Profiles'}
            </button>

            {/* Add Profile Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141414] w-full max-w-2xl p-8 rounded-lg shadow-2xl border border-gray-800"
                        >
                            <h2 className="text-3xl font-medium text-white mb-2">Add Profile</h2>
                            <p className="text-gray-400 mb-8">Add a profile for another person watching Streamr.</p>

                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-t border-b border-gray-800 py-8 mb-8">
                                <div className="relative group">
                                    <img
                                        src={selectedAvatar}
                                        alt="Profile Avatar"
                                        className="w-32 h-32 rounded-md object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                                        <span className="text-transparent group-hover:text-white font-medium text-sm">Change</span>
                                    </div>
                                    {/* Simple avatar selector for now - could be a modal */}
                                    <div className="absolute top-full left-0 mt-2 grid grid-cols-4 gap-2 w-64 bg-[#141414] border border-gray-800 p-2 rounded-md shadow-xl z-10 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                                        {AVATARS.map((avatar) => (
                                            <button
                                                key={avatar}
                                                onClick={() => setSelectedAvatar(avatar)}
                                                className={`w-12 h-12 rounded-sm overflow-hidden border-2 ${selectedAvatar === avatar ? 'border-white' : 'border-transparent'}`}
                                            >
                                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 w-full">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className="w-full bg-[#333] text-white px-4 py-3 rounded outline-none focus:bg-[#444] placeholder-gray-500"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleAddProfile}
                                    disabled={!newProfileName.trim()}
                                    className="bg-white text-black px-8 py-2 font-semibold hover:bg-[#c00] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="border border-gray-500 text-gray-500 px-8 py-2 font-semibold hover:border-white hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default ProfileSelection;
