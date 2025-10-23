import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestAuth = () => {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ position: 'fixed', top: '100px', right: '20px', backgroundColor: 'white', padding: '10px', border: '1px solid black', zIndex: 9999 }}>
      <h3>Auth Status</h3>
      {user ? (
        <div>
          <p>Logged in as: {user.username || user.email}</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <p>Not logged in.</p>
      )}
    </div>
  );
};

export default TestAuth;
