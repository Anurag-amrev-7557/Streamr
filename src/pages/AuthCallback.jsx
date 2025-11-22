import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const checkAuth = useAuthStore((state) => state.checkAuth);

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Token is set in cookie by backend, but we can also verify it here
            // Or just trigger a checkAuth which will call /me
            checkAuth().then(() => {
                navigate('/');
            });
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate, checkAuth]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-black">
            <Loader2 className="w-10 h-10 text-netflix-red animate-spin" />
        </div>
    );
};

export default AuthCallback;
