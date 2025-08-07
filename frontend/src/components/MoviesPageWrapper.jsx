import React, { Suspense, lazy } from 'react';

// Create a lazy-loaded MoviesPage with error handling
const MoviesPageLazy = lazy(() => {
  return new Promise((resolve, reject) => {
    import('./MoviesPage')
      .then(module => {
        console.log('MoviesPage loaded successfully');
        resolve(module);
      })
      .catch(error => {
        console.error('Failed to load MoviesPage:', error);
        // Fallback to a simple error component
        resolve({
          default: () => (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Failed to Load Movies Page</h2>
                <p className="text-gray-600 mb-4">There was an error loading the movies page.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )
        });
      });
  });
});

const MoviesPageWrapper = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <MoviesPageLazy />
    </Suspense>
  );
};

export default MoviesPageWrapper; 