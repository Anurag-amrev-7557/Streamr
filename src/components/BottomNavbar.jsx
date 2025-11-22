import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Tv, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const BottomNavbar = () => {
    const location = useLocation();
    const currentPath = location.pathname;

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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe" style={{ willChange: 'transform' }}>
            {/* Glassmorphism Background */}
            <div className="relative bg-black/80 backdrop-blur-xl border-t border-white/10">
                {/* Navigation Items */}
                <div className="relative flex items-center py-2">
                    {/* White Moving Background */}
                    <motion.div
                        layoutId="whiteActiveTab"
                        className="absolute bg-white rounded-xl mx-2"
                        style={{
                            left: `${navItems.findIndex(item => item.active) * 25}%`,
                            width: '22%',
                            height: 'calc(100% - 8px)',
                            top: '4px'
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
                                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-300 group"
                                style={{ width: '25%' }}
                            >
                                {/* Icon */}
                                <div className="relative z-10">
                                    <Icon
                                        className={clsx(
                                            'w-5 h-5 transition-all duration-300',
                                            item.active
                                                ? 'text-black scale-105'
                                                : 'text-gray-400 group-hover:text-gray-200'
                                        )}
                                        strokeWidth={1.5}
                                    />
                                </div>

                                {/* Label */}
                                <span
                                    className={clsx(
                                        'relative z-10 text-[10px] font-medium transition-all duration-300',
                                        item.active
                                            ? 'text-black font-semibold'
                                            : 'text-gray-400 group-hover:text-gray-200'
                                    )}
                                >
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNavbar;
