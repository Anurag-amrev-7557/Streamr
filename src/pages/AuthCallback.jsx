import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const navigate = useNavigate();
    const { checkAuth, user, isCheckingAuth } = useAuthStore();
    const [hasChecked, setHasChecked] = useState(false);
    const authCheckInitiated = useRef(false);

    useEffect(() => {
        if (!authCheckInitiated.current) {
            authCheckInitiated.current = true;
            setHasChecked(true); // eslint-disable-line react-hooks/set-state-in-effect
            // Trigger auth check which will now use the cookie
            checkAuth();
        }
    }, [checkAuth]);

    // Wait for auth check to complete and user state to update
    useEffect(() => {
        if (hasChecked && !isCheckingAuth) {
            if (user) {
                // Successfully authenticated, navigate to home
                navigate('/');
            } else {
                // Authentication failed, go back to login
                navigate('/login');
            }
        }
    }, [hasChecked, isCheckingAuth, user, navigate]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
                <p className="text-white/70 text-sm">Completing sign in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
