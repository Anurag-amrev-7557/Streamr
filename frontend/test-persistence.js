console.log('Testing persistence...'); window.testPersistence = () => { const data = localStorage.getItem('viewingProgress'); console.log('Current data:', data); return data; };
