// Test utility for CastDetailsOverlay API functions
import { getPersonDetails, searchPeople } from '../services/tmdbService';

export const testCastDetailsAPI = async () => {
  console.log('🧪 Testing CastDetailsOverlay API functions...');
  
  try {
    // Test 1: Search for a well-known actor
    console.log('1. Testing searchPeople...');
    const searchResults = await searchPeople('Tom Hanks', 1);
    console.log('Search results:', searchResults);
    
    if (searchResults?.results?.length > 0) {
      const personId = searchResults.results[0].id;
      console.log('Found person ID:', personId);
      
      // Test 2: Get person details
      console.log('2. Testing getPersonDetails...');
      const personDetails = await getPersonDetails(personId);
      console.log('Person details:', personDetails);
      
      console.log('✅ All tests passed!');
      return { success: true, personDetails };
    } else {
      console.log('❌ No search results found');
      return { success: false, error: 'No search results' };
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Test with a sample person object
export const testWithSamplePerson = async () => {
  console.log('🧪 Testing with sample person object...');
  
  const samplePerson = {
    id: 31, // Tom Hanks' TMDB ID
    name: 'Tom Hanks',
    character: 'Forrest Gump',
    image: 'https://image.tmdb.org/t/p/w185/xxPMucou2wRDxLrud8i2D4dsywh.jpg'
  };
  
  try {
    const personDetails = await getPersonDetails(samplePerson.id);
    console.log('Sample person details:', personDetails);
    return { success: true, personDetails };
  } catch (error) {
    console.error('❌ Sample test failed:', error);
    return { success: false, error: error.message };
  }
};

// Run tests in browser console
if (typeof window !== 'undefined') {
  window.testCastDetailsAPI = testCastDetailsAPI;
  window.testWithSamplePerson = testWithSamplePerson;
  
  console.log('🧪 CastDetailsOverlay test functions available:');
  console.log('- testCastDetailsAPI()');
  console.log('- testWithSamplePerson()');
} 