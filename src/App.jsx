import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Watch from './pages/Watch';
import MyList from './pages/MyList';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/useAuthStore';

function App() {
  const { user, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <div className="h-screen w-full bg-black" />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/oauth-success" element={<AuthCallback />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/watch/:id" element={
          <ProtectedRoute>
            <Watch />
          </ProtectedRoute>
        } />
        <Route path="/my-list" element={
          <ProtectedRoute>
            <MyList />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
