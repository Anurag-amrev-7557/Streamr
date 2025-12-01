import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2 } from 'lucide-react';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWindow = () => {
    const { isChatOpen, activeChat, messages, closeChat, sendMessage } = useChatStore();
    const { user } = useAuthStore();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isChatOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    if (!isChatOpen || !activeChat) return null;

    return (
        <AnimatePresence>
            {isChatOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-black border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
                >
                    {/* Header */}
                    <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img
                                    src={activeChat.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'}
                                    alt={activeChat.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{activeChat.name}</h3>
                                <p className="text-xs text-gray-400">@{activeChat.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={closeChat}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender === user._id || msg.sender._id === user._id;
                            return (
                                <div
                                    key={idx}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                                ? 'bg-white text-black rounded-tr-sm'
                                                : 'bg-white/10 text-white rounded-tl-sm'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-black border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="absolute right-1.5 p-1.5 bg-white text-black rounded-full hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatWindow;
