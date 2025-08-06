import React, { useState } from 'react';
import { getPosterProps, getBackdropProps } from '../utils/imageUtils';

const TestImageCors = () => {
  const [testResults, setTestResults] = useState([]);
  
  const testImages = [
    { path: '/6YFWTX7fiGjWpsnJWLLV4RSbJWd.png', name: 'Test Poster 1' },
    { path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', name: 'Test Poster 2' },
    { path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', name: 'Test Backdrop' }
  ];

  const testImageLoad = async (imagePath, imageName) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        resolve({ success: true, name: imageName, path: imagePath });
      };
      
      img.onerror = () => {
        resolve({ success: false, name: imageName, path: imagePath, error: 'Failed to load' });
      };
      
      img.src = getPosterProps({ poster_path: imagePath }, 'w500').src;
    });
  };

  const runTests = async () => {
    setTestResults([]);
    
    for (const testImage of testImages) {
      const result = await testImageLoad(testImage.path, testImage.name);
      setTestResults(prev => [...prev, result]);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">CORS Image Test</h2>
      
      <button 
        onClick={runTests}
        className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Run CORS Tests
      </button>
      
      <div className="space-y-4">
        {testResults.map((result, index) => (
          <div 
            key={index} 
            className={`p-4 rounded border ${
              result.success 
                ? 'bg-green-900 border-green-500' 
                : 'bg-red-900 border-red-500'
            }`}
          >
            <h3 className="font-semibold">{result.name}</h3>
            <p className="text-sm opacity-80">Path: {result.path}</p>
            <p className="text-sm">
              Status: {result.success ? '✅ Success' : '❌ Failed'}
            </p>
            {result.error && (
              <p className="text-sm text-red-300">Error: {result.error}</p>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Test Images:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testImages.map((image, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded">
              <img
                {...getPosterProps({ poster_path: image.path }, 'w300')}
                className="w-full h-auto rounded"
                alt={image.name}
              />
              <p className="text-sm mt-2 text-center">{image.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestImageCors; 