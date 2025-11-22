import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Tv, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const BottomNavbar = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isHidden = ['/login', '/signup', '/watch'].some(path => currentPath.includes(path));

    if (isHidden) return null;

    const navItems = [
        {
            name: 'Home',
            icon: Home,
            path: '/',
            active: currentPath === '/'
        },
        {
            name: 'Movies',
            icon: Film,
            path: '/?filter=movies',
            active: location.search.includes('filter=movies')
        },
        {
            name: 'Series',
            icon: Tv,
            path: '/?filter=series',
            active: location.search.includes('filter=series')
        },
        {
            name: 'My List',
            icon: Heart,
            path: '/my-list',
            active: currentPath === '/my-list'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 flex justify-center pointer-events-none" style={{ willChange: 'transform' }}>
            {/* Glassmorphism Pill Container */}
            <div className="pointer-events-auto bg-black/30 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-1 w-full max-w-[280px]">
                {/* Navigation Items */}
                <div className="relative flex items-center justify-between">
                    {/* White Moving Background */}
                    <motion.div
                        layoutId="whiteActiveTab"
                        className="absolute bg-white rounded-full"
                        style={{
                            left: `${navItems.findIndex(item => item.active) * 25}%`,
                            width: '25%',
                            height: '100%',
                        }}
                        initial={false}
                        animate={{
                            left: `${navItems.findIndex(item => item.active) * 25}%`
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 30
                        }}
                    />

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className="relative flex items-center justify-center py-2 transition-all duration-300 group"
                                style={{ width: '25%' }}
                            >
                                {/* Icon */}
                                <div className="relative z-10">
                                    <Icon
                                        className={clsx(
                                            'w-6 h-6 transition-all duration-300',
                                            item.active
                                                ? 'text-black scale-110'
                                                : 'text-gray-400 group-hover:text-gray-200'
                                        )}
                                        strokeWidth={1.5}
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNavbar;
