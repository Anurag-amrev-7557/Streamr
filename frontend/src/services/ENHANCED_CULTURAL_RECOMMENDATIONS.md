# Enhanced Cultural Recommendation System

## Overview
The recommendation system has been significantly enhanced to provide more relevant content based on language and region preferences. This implementation focuses on cultural context awareness and user preference detection to deliver personalized recommendations that respect linguistic and regional diversity.

## Key Enhancements

### 1. **Increased Language and Region Weights**
- **Language weight**: Increased from 0.08 to 0.15 (87.5% increase)
- **Region weight**: Increased from 0.08 to 0.15 (87.5% increase)
- **Cultural context weights**: Region-specific weighting for different cultural areas

### 2. **Cultural Context Awareness**
```javascript
this.culturalContextWeights = {
  'north-america': { language: 0.20, region: 0.18, genre: 0.20 },
  'europe': { language: 0.18, region: 0.20, genre: 0.18 },
  'asia': { language: 0.25, region: 0.22, genre: 0.15 },
  'latin-america': { language: 0.22, region: 0.20, genre: 0.16 },
  'middle-east': { language: 0.20, region: 0.22, genre: 0.16 },
  'africa': { language: 0.18, region: 0.20, genre: 0.18 },
  'oceania': { language: 0.16, region: 0.18, genre: 0.20 }
};
```

### 3. **Enhanced Similarity Calculation**
The `calculateSimilarityScore` method now includes:
- **User preference detection** for language and region
- **Regional language boost** based on user's geographic location
- **Cultural affinity calculation** for genre preferences by region
- **Cultural content type similarity** for specialized content types

### 4. **User Preference Detection**
```javascript
async detectUserCulturalPreferences(userId) {
  // Tracks user's preferred languages, regions, and cultural content types
  // Based on viewing history and ratings
}
```

### 5. **Comprehensive Cultural Mapping**
Enhanced cultural recommendations include:

#### Asian Cultures
- **Bollywood**: Hindi cinema with musical and family elements
- **Korean Wave**: K-dramas and Korean cinema
- **Anime**: Japanese animation and manga adaptations
- **Chinese Cinema**: Wuxia and Chinese drama
- **Japanese Cinema**: Samurai films and Japanese drama
- **Thai Cinema**: Thai drama and comedy
- **Vietnamese Cinema**: Vietnamese drama

#### European Cultures
- **European Arthouse**: Art-house and experimental films
- **Scandinavian Noir**: Nordic crime and mystery
- **French New Wave**: Nouvelle vague cinema
- **Italian Neorealism**: Italian cinema classics
- **German Expressionism**: German cinema
- **British Cinema**: British drama and comedy
- **Spanish Cinema**: Spanish drama and comedy

#### Latin American Cultures
- **Telenovelas**: Spanish soap operas
- **Brazilian Cinema**: Brazilian drama and comedy
- **Mexican Cinema**: Mexican drama and horror
- **Argentine Cinema**: Argentine drama and comedy

#### Middle Eastern Cultures
- **Turkish Drama**: Turkish soap operas and drama
- **Iranian Cinema**: Iranian drama and art-house
- **Israeli Cinema**: Israeli drama and comedy

#### African Cultures
- **Nollywood**: Nigerian cinema and African drama
- **South African Cinema**: South African drama
- **Egyptian Cinema**: Egyptian drama and comedy

#### North American Cultures
- **American Indie**: Independent films and indie drama
- **Canadian Cinema**: Canadian drama and comedy

#### Oceanian Cultures
- **Australian Cinema**: Australian drama and comedy
- **New Zealand Cinema**: New Zealand drama

### 6. **Regional Language Preferences**
```javascript
const regionalLanguagePreferences = {
  'north-america': { 'en': 0.3, 'es': 0.2, 'fr': 0.1 },
  'europe': { 'en': 0.2, 'fr': 0.3, 'de': 0.25, 'es': 0.2, 'it': 0.2 },
  'asia': { 'ja': 0.4, 'ko': 0.35, 'zh': 0.3, 'hi': 0.25, 'th': 0.2 },
  'latin-america': { 'es': 0.4, 'pt': 0.3, 'en': 0.15 },
  'middle-east': { 'ar': 0.4, 'tr': 0.3, 'he': 0.25, 'en': 0.15 },
  'africa': { 'en': 0.3, 'fr': 0.25, 'ar': 0.2 },
  'oceania': { 'en': 0.4, 'ma': 0.2 }
};
```

### 7. **Cultural Affinity Mapping**
Different regions have different genre preferences:
```javascript
const culturalAffinityMap = {
  'north-america': {
    'action': 0.3, 'comedy': 0.25, 'drama': 0.2, 'family': 0.2,
    'western': 0.15, 'sci-fi': 0.2, 'horror': 0.15
  },
  'asia': {
    'action': 0.3, 'drama': 0.3, 'romance': 0.25, 'horror': 0.2,
    'martial-arts': 0.35, 'anime': 0.4, 'thriller': 0.25
  },
  // ... more regions
};
```

### 8. **Enhanced API Methods**

#### New Methods Added:
- `getRegionalLanguageBoost()`: Provides language preference boosts based on region
- `isContentFromRegion()`: Checks if content matches user's preferred region
- `calculateCulturalAffinity()`: Calculates cultural affinity between content and user region
- `calculateCulturalContentSimilarity()`: Identifies cultural content types
- `detectUserCulturalPreferences()`: Analyzes user behavior for cultural preferences
- `getRegionFromCountry()`: Maps country codes to regions
- `getCulturalContentType()`: Identifies cultural content types from item details
- `culturalRecommendation()`: New recommendation strategy focused on cultural context
- `fetchContentByCountry()`: Fetches content from specific countries
- `applyCulturalDiversityBoost()`: Applies cultural diversity to recommendations

### 9. **Usage Examples**

#### Basic Cultural Recommendations
```javascript
// Get cultural recommendations for a user
const culturalRecs = await enhancedSimilarContentService.culturalRecommendation(
  userId, 
  'movie', 
  { 
    limit: 30,
    useUserPreferences: true,
    includeRegionalContent: true,
    includeLanguageSpecific: true
  }
);
```

#### Enhanced Similar Content with Cultural Context
```javascript
// Get similar content with cultural awareness
const similarContent = await enhancedSimilarContentService.getEnhancedSimilarContent(
  contentId, 
  'movie', 
  { 
    userId: userId,
    useCulturalContext: true,
    limit: 50
  }
);
```

#### Language-Specific Recommendations
```javascript
// Get recommendations in specific language
const languageRecs = await enhancedSimilarContentService.getLanguageSpecificRecommendations(
  'ko', // Korean
  'movie',
  { 
    limit: 30,
    quality: 'high',
    includeSubtitles: true
  }
);
```

#### Region-Specific Recommendations
```javascript
// Get recommendations from specific region
const regionRecs = await enhancedSimilarContentService.getRegionSpecificRecommendations(
  'asia',
  'movie',
  { 
    limit: 30,
    includeLocalProductions: true,
    includeCoProductions: true
  }
);
```

### 10. **Performance Improvements**
- **Caching**: Enhanced caching with user-specific cache keys
- **Parallel fetching**: Multiple recommendation sources fetched in parallel
- **Rate limiting**: Respectful API rate limiting with fallbacks
- **Error handling**: Graceful degradation when cultural context is unavailable

### 11. **Benefits**

#### For Users:
- **More relevant content**: Recommendations match cultural preferences
- **Language diversity**: Content in preferred languages
- **Regional relevance**: Content from preferred regions
- **Cultural discovery**: Exposure to diverse cultural content

#### For Content Discovery:
- **Better matching**: Content matched based on cultural context
- **Diversity**: Balanced recommendations across languages and regions
- **Personalization**: User-specific cultural preferences
- **Quality**: High-quality content from specific regions and languages

### 12. **Technical Implementation**

#### Cultural Context Integration:
1. **User preference detection** from viewing history
2. **Regional language boost** based on geographic location
3. **Cultural affinity calculation** for genre preferences
4. **Dynamic weighting** based on cultural context
5. **Diversity boosting** for cultural variety

#### Recommendation Flow:
1. **Detect user cultural preferences** from behavior
2. **Apply cultural context weights** to similarity calculation
3. **Fetch multiple cultural sources** (language, region, country, genre)
4. **Calculate enhanced similarity scores** with cultural factors
5. **Apply cultural diversity boost** for variety
6. **Cache results** with user-specific keys

### 13. **Future Enhancements**
- **Machine learning integration** for better preference detection
- **Real-time cultural trend analysis**
- **Advanced cultural content classification**
- **Multi-language subtitle support**
- **Cultural festival and event integration**
- **Regional content popularity tracking**

## Conclusion
The enhanced cultural recommendation system provides a sophisticated approach to content discovery that respects linguistic and regional diversity while maintaining high relevance and quality. The system adapts to user preferences while promoting cultural discovery and diversity. 