import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white p-4 text-center">
            <h1 className="text-6xl md:text-9xl font-bold text-[#E50914] mb-4">404</h1>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Page Not Found</h2>
            <p className="text-gray-400 max-w-md mb-8 text-lg">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link
                to="/"
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
            >
                <Home className="w-5 h-5" />
                Back to Home
            </Link>
        </div>
    );
};

export default NotFound;
