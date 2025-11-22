import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isCheckingAuth } = useAuthStore();

    if (isCheckingAuth) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 text-netflix-red animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;
