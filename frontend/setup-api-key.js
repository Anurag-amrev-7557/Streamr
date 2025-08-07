#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎬 Streamr - TMDB API Key Setup');
console.log('================================\n');

console.log('To get a free TMDB API key:');
console.log('1. Go to https://www.themoviedb.org/settings/api');
console.log('2. Create a free account if you don\'t have one');
console.log('3. Request an API key (choose "Developer" option)');
console.log('4. Copy your API key\n');

rl.question('Enter your TMDB API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n❌ No API key provided. Please run this script again with a valid API key.');
    rl.close();
    return;
  }

  const envContent = `# TMDB API Configuration
VITE_TMDB_API_KEY=${apiKey.trim()}

# Backend Configuration (optional)
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001/community
`;

  const envPath = path.join(__dirname, '.env');

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ API key saved successfully!');
    console.log('📁 Created .env file at:', envPath);
    console.log('\n🔄 Please restart your development server:');
    console.log('   npm run dev');
    console.log('\n🎉 Your app should now work without CORS or API key errors!');
  } catch (error) {
    console.error('\n❌ Error saving API key:', error.message);
    console.log('\n📝 Please manually create a .env file in the frontend directory with:');
    console.log('VITE_TMDB_API_KEY=your_api_key_here');
  }

  rl.close();
}); 