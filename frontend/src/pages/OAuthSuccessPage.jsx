import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userStr = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login', { state: { error } });
      return;
    }

    if (token && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Store tokens
        localStorage.setItem('accessToken', token);
        // Update auth context with user data
        login({ user, accessToken: token });
        // Redirect to profile
        navigate('/');
      } catch (err) {
        console.error('Error processing OAuth response:', err);
        navigate('/login', { state: { error: 'Failed to process authentication' } });
      }
    } else {
      navigate('/login', { state: { error: 'Invalid authentication response' } });
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Completing Authentication...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default OAuthSuccessPage; 