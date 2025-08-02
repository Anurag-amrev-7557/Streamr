# Enhanced Recommendation System

## Overview

The Enhanced Similar Content Service has been significantly improved to include multiple new factors for better, more personalized recommendations. The system now considers franchise/collection relationships, actors, language preferences, regional/cultural factors, and production company information in addition to the existing genre, cast, crew, and rating factors.

## New Recommendation Factors

### 1. Franchise/Collection Similarity (Weight: 15%)

**Purpose**: Recommend content from the same franchise or related franchises.

**Features**:
- Exact franchise matches (e.g., all Marvel Cinematic Universe movies)
- Partial name matches (e.g., "Marvel" vs "Marvel Cinematic Universe")
- Keyword-based franchise detection (Marvel, DC, Star Wars, etc.)
- Related franchise recommendations

**API Methods**:
```javascript
// Get franchise-based recommendations
const franchiseRecommendations = await similarContentUtils.getFranchiseBasedRecommendations(
  collectionId, 
  'movie', 
  { includeRelatedFranchises: true }
);
```

### 2. Enhanced Language Similarity (Weight: 8%)

**Purpose**: Consider language preferences and language family relationships.

**Features**:
- Exact language matches
- Language family groupings (Romance, Germanic, Slavic, etc.)
- Related language families (e.g., Romance languages: Spanish, French, Italian)
- Support for 30+ languages including:
  - European: English, Spanish, French, German, Italian, Portuguese, etc.
  - Asian: Chinese, Japanese, Korean, Hindi, Thai, Vietnamese, etc.
  - Middle Eastern: Arabic, Turkish, Hebrew, etc.
  - African: Various African languages

**Language Families**:
- **Romance**: Spanish, French, Italian, Portuguese, Romanian
- **Germanic**: English, German, Dutch, Swedish, Norwegian, Danish
- **Slavic**: Russian, Polish, Czech, Bulgarian
- **Scandinavian**: Swedish, Norwegian, Danish
- **Chinese**: Chinese (Mandarin, Cantonese)
- **Japanese**: Japanese
- **Korean**: Korean

### 3. Regional/Cultural Similarity (Weight: 8%)

**Purpose**: Consider production countries and regional preferences.

**Features**:
- Exact country matches
- Regional groupings (North America, Europe, Asia, etc.)
- Related regions (European, Asian, American, African)
- Cultural similarity scoring

**Regional Groups**:
- **North America**: US, Canada, Mexico
- **Europe**: UK, France, Germany, Italy, Spain, Netherlands, etc.
- **Asia**: Japan, Korea, China, India, Thailand, Vietnam, etc.
- **Latin America**: Brazil, Argentina, Chile, Colombia, Peru, etc.
- **Middle East**: Turkey, Israel, UAE, Saudi Arabia, Egypt, Iran
- **Africa**: South Africa, Nigeria, Egypt, Kenya, Ghana
- **Oceania**: Australia, New Zealand
- **Eastern Europe**: Russia, Ukraine, Belarus, Moldova, etc.
- **Scandinavia**: Sweden, Norway, Denmark, Finland, Iceland
- **Balkans**: Serbia, Croatia, Slovenia, Bosnia, Montenegro, etc.

### 4. Production Company Similarity (Weight: 2%)

**Purpose**: Recommend content from the same production companies.

**Features**:
- Production company overlap scoring
- Studio-based recommendations
- Quality-based filtering

### 5. Enhanced Actor Recommendations (Weight: 18%)

**Purpose**: Provide actor-based recommendations with co-star and similar actor suggestions.

**Features**:
- Actor filmography recommendations
- Co-star recommendations
- Similar actor recommendations
- Actor collaboration patterns

**API Methods**:
```javascript
// Get actor-based recommendations
const actorRecommendations = await similarContentUtils.getActorBasedRecommendations(
  actorId, 
  'movie', 
  { 
    includeCoStars: true, 
    includeSimilarActors: true 
  }
);
```

### 6. Enhanced Director Recommendations (Weight: 12%)

**Purpose**: Provide director-based recommendations with similar director suggestions.

**Features**:
- Director filmography recommendations
- Similar director recommendations
- Director style matching

**API Methods**:
```javascript
// Get director-based recommendations
const directorRecommendations = await similarContentUtils.getDirectorBasedRecommendations(
  directorId, 
  'movie', 
  { includeSimilarDirectors: true }
);
```

## Updated Relevance Weights

The system now uses a more balanced weighting system:

```javascript
this.relevanceWeights = {
  genre: 0.25,           // Reduced from 0.35
  cast: 0.18,            // Reduced from 0.20
  crew: 0.12,            // Reduced from 0.15
  franchise: 0.15,       // NEW
  language: 0.08,        // Increased from 0.03
  region: 0.08,          // NEW
  year: 0.08,            // Reduced from 0.10
  rating: 0.06,          // Reduced from 0.08
  popularity: 0.04,      // Reduced from 0.05
  runtime: 0.02,         // Unchanged
  budget: 0.02,          // Unchanged
  productionCompany: 0.02 // NEW
};
```

## Enhanced Similarity Calculation

The `calculateSimilarityScore` method now includes:

1. **Franchise Similarity**: Checks for exact matches, partial name matches, and keyword-based franchise detection
2. **Language Similarity**: Considers exact matches, language families, and related language families
3. **Regional Similarity**: Considers exact country matches, regional groupings, and related regions
4. **Production Company Similarity**: Considers production company overlap

## New API Methods

### Franchise-Based Recommendations

```javascript
// Get recommendations from a specific franchise
const franchiseRecs = await similarContentUtils.getFranchiseBasedRecommendations(
  collectionId, 
  'movie', 
  { 
    limit: 30,
    includeRelatedFranchises: true 
  }
);
```

### Actor-Based Recommendations

```javascript
// Get recommendations based on an actor
const actorRecs = await similarContentUtils.getActorBasedRecommendations(
  actorId, 
  'movie', 
  { 
    limit: 30,
    includeCoStars: true,
    includeSimilarActors: true 
  }
);
```

### Director-Based Recommendations

```javascript
// Get recommendations based on a director
const directorRecs = await similarContentUtils.getDirectorBasedRecommendations(
  directorId, 
  'movie', 
  { 
    limit: 30,
    includeSimilarDirectors: true 
  }
);
```

## Enhanced Metadata Fetching

The system now fetches additional metadata for better recommendations:

```javascript
// Enhanced content details include:
{
  id: data.id,
  title: data.title || data.name,
  genres: data.genres || [],
  year: year,
  vote_average: data.vote_average,
  popularity: data.popularity,
  cast: data.credits?.cast || [],
  crew: data.credits?.crew || [],
  overview: data.overview,
  original_language: data.original_language,
  // NEW: Enhanced metadata
  belongs_to_collection: data.belongs_to_collection || null,
  production_countries: data.production_countries || [],
  production_companies: data.production_companies || [],
  budget: data.budget,
  revenue: data.revenue,
  runtime: data.runtime,
  spoken_languages: data.spoken_languages || [],
  status: data.status,
  adult: data.adult
}
```

## Cultural and Regional Recommendations

The system includes specialized methods for cultural and regional content:

### Language-Specific Recommendations

```javascript
// Get recommendations in a specific language
const languageRecs = await similarContentUtils.getLanguageSpecificRecommendations(
  'spanish', 
  'movie', 
  { 
    limit: 30,
    includeSubtitles: true,
    quality: 'high' 
  }
);
```

### Region-Specific Recommendations

```javascript
// Get recommendations from a specific region
const regionRecs = await similarContentUtils.getRegionSpecificRecommendations(
  'europe', 
  'movie', 
  { 
    limit: 30,
    includeLocalProductions: true,
    includeCoProductions: true 
  }
);
```

### Cultural Recommendations

```javascript
// Get recommendations based on cultural preferences
const culturalRecs = await similarContentUtils.getCulturalRecommendations(
  'bollywood', 
  'movie', 
  { 
    limit: 30,
    includeClassics: true,
    includeContemporary: true 
  }
);
```

## Supported Cultural Categories

- **Bollywood**: Hindi cinema
- **Korean Wave**: K-dramas and Korean content
- **Anime**: Japanese animation
- **Nollywood**: Nigerian cinema
- **Telenovelas**: Spanish soap operas
- **European Arthouse**: European art films
- **Scandinavian Noir**: Nordic crime dramas
- **French New Wave**: French cinema
- **Italian Neorealism**: Italian cinema
- **German Expressionism**: German cinema
- **Russian Literary**: Russian adaptations
- **Chinese Wuxia**: Chinese martial arts
- **Japanese Samurai**: Japanese period films
- **Korean Thrillers**: Korean thrillers
- **Turkish Drama**: Turkish dramas
- **Brazilian Cinema**: Brazilian films
- **Mexican Cinema**: Mexican films
- **Australian Cinema**: Australian films
- **Canadian Cinema**: Canadian films
- **British Cinema**: British films

## Performance Optimizations

1. **Caching**: Enhanced caching for franchise, actor, and director data
2. **Rate Limiting**: Intelligent rate limiting for API calls
3. **Batch Processing**: Batch processing for multiple recommendations
4. **Fallback Mechanisms**: Graceful fallbacks when specific data is unavailable

## Usage Examples

### Basic Enhanced Similar Content

```javascript
import { similarContentUtils } from './enhancedSimilarContentService.js';

// Get enhanced similar content with all new factors
const similarContent = await similarContentUtils.getSimilarContent(
  movieId, 
  'movie', 
  { 
    limit: 50,
    minScore: 0.2,
    includeDetails: true 
  }
);
```

### Franchise-Based Recommendations

```javascript
// Get all movies from the Marvel Cinematic Universe
const marvelMovies = await similarContentUtils.getFranchiseBasedRecommendations(
  marvelCollectionId, 
  'movie', 
  { includeRelatedFranchises: true }
);
```

### Actor-Based Recommendations

```javascript
// Get movies featuring Tom Hanks and similar actors
const tomHanksMovies = await similarContentUtils.getActorBasedRecommendations(
  tomHanksId, 
  'movie', 
  { 
    includeCoStars: true,
    includeSimilarActors: true 
  }
);
```

### Language-Specific Recommendations

```javascript
// Get high-quality Spanish movies
const spanishMovies = await similarContentUtils.getLanguageSpecificRecommendations(
  'spanish', 
  'movie', 
  { 
    quality: 'high',
    includeSubtitles: true 
  }
);
```

## Benefits

1. **More Accurate Recommendations**: Multiple factors provide better similarity scoring
2. **Cultural Diversity**: Regional and language-based recommendations
3. **Franchise Discovery**: Help users discover related franchise content
4. **Actor/Director Discovery**: Help users discover content from favorite creators
5. **Personalized Experience**: Better understanding of user preferences
6. **Global Content**: Support for international and regional content

## Future Enhancements

1. **Machine Learning Integration**: Use ML models for better similarity scoring
2. **User Behavior Analysis**: Learn from user interactions
3. **Real-time Updates**: Dynamic recommendation updates based on trends
4. **A/B Testing**: Test different recommendation strategies
5. **Advanced Analytics**: Detailed analytics on recommendation performance

## Conclusion

The enhanced recommendation system now provides Netflix-level recommendations by considering multiple factors including franchise relationships, language preferences, regional content, and production company information. This creates a more personalized and culturally diverse viewing experience for users. 