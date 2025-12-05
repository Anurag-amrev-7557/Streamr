// TMDB Genre IDs
export const GENRES = {
    ACTION: 28,
    ADVENTURE: 12,
    ANIMATION: 16,
    COMEDY: 35,
    CRIME: 80,
    DOCUMENTARY: 99,
    DRAMA: 18,
    FAMILY: 10751,
    FANTASY: 14,
    HISTORY: 36,
    HORROR: 27,
    MUSIC: 10402,
    MYSTERY: 9648,
    ROMANCE: 10749,
    SCIENCE_FICTION: 878,
    TV_MOVIE: 10770,
    THRILLER: 53,
    WAR: 10752,
    WESTERN: 37,
    ACTION_ADVENTURE: 10759, // TV
    KIDS: 10762, // TV
    NEWS: 10763, // TV
    REALITY: 10764, // TV
    SCI_FI_FANTASY: 10765, // TV
    SOAP: 10766, // TV
    TALK: 10767, // TV
    WAR_POLITICS: 10768, // TV
};

// TMDB Keyword IDs (Researched)
export const KEYWORDS = {
    ANIME: 210024,
    SUPERHERO: 9715,
    MINISERIES: 209396,
    SITCOM: 3928,
    STANDUP: 9716,
    TRUE_STORY: 9672,
    BIOGRAPHY: 5565,
    DARK_COMEDY: 9717,
    DYSTOPIA: 4565,
    TIME_TRAVEL: 4379,
    ZOMBIE: 17293,
    ZOMBIE_APOCALYPSE: 186565,
    VAMPIRE: 1729,
    MARTIAL_ARTS: 14681,
    NOIR: 10753,
    SPACE_OPERA: 161176,
    INDIE: 10183,
    POLITICS: 2833,
    GANGSTER: 8650,
    ONE_PERSON_ARMY: 162365,
    PERIOD_PIECE: 11438,
    INDIA: 10594,
    KOREA: 209594,
    FEEL_GOOD: 10632,
    SUSPENSE: 10733,
    SURVIVAL: 10085,
    REVENGE: 9748,
    ROAD_TRIP: 190479,
    COMING_OF_AGE: 10683,
    HIGH_SCHOOL: 6270,
    ALIEN: 9951,
    ROBOT: 14544,
    MAGIC: 2343,
    WITCH: 2552,
    GHOST: 9918,
    SLASHER: 12339,
    SERIAL_KILLER: 10714,
    HEIST: 10051,
    PRISON: 378,
    LAWYER: 10479,
    DOCTOR: 10480,
    SPORTS: 6075,
    FOOTBALL: 5419,
    BASKETBALL: 6078,
    COOKING: 6054,
    DANCE: 1605,
    MUSICAL: 10402,
    CHRISTMAS: 207317,
    HALLOWEEN: 3335,
    ROMANTIC_COMEDY: 9799,
    BUDDY_COP: 9814,
    DISASTER: 10548,
    POST_APOCALYPTIC: 2853,
    CYBERPUNK: 2450,
    STEAMPUNK: 10609,
    SPACE: 9882,
    MONSTER: 1299,
    KAIJU: 168435,
    SUPERNATURAL: 9663,
    MYTHOLOGY: 10834,
    FAIRY_TALE: 3205,
    EPIC: 10757,
    WESTERN_STYLE: 37,
    WAR_STYLE: 10752,
    ARTIFICIAL_INTELLIGENCE: 310,
    DINOSAURS: 12616,
    SPY: 470,
    FOUND_FOOTAGE: 210024,
    CULT_FILM: 34038,
    RACING: 830,
    ALIENS: 9951,
};

export const CATEGORIES = [
    // --- Streaming Services (TV) ---
    {
        id: 'netflix_originals',
        title: 'Netflix Originals',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_networks: 213, sort_by: 'popularity.desc' }
    },
    {
        id: 'hbo_gems',
        title: 'HBO Gems',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_networks: 49, sort_by: 'popularity.desc' }
    },
    {
        id: 'apple_tv_plus',
        title: 'Apple TV+ Hits',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_networks: 2552, sort_by: 'popularity.desc' }
    },
    {
        id: 'disney_plus_originals',
        title: 'Disney+ Originals',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_networks: 2739, sort_by: 'popularity.desc' }
    },
    {
        id: 'amazon_originals',
        title: 'Amazon Originals',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_networks: 1024, sort_by: 'popularity.desc' }
    },

    // --- Decades ---
    {
        id: '2010s_hits',
        title: '2010s Hits',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31', sort_by: 'popularity.desc' }
    },
    {
        id: '2000s_hits',
        title: '2000s Hits',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31', sort_by: 'popularity.desc' }
    },
    {
        id: '70s_cinema',
        title: '70s Cinema',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.gte': '1970-01-01', 'primary_release_date.lte': '1979-12-31', sort_by: 'popularity.desc' }
    },

    // --- Niche & Fun ---
    {
        id: 'spy_thrillers',
        title: 'Spy & Espionage',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.SPY, sort_by: 'popularity.desc' }
    },
    {
        id: 'ai_takeover',
        title: 'A.I. Takeover',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.ARTIFICIAL_INTELLIGENCE, sort_by: 'popularity.desc' }
    },
    {
        id: 'dino_world',
        title: 'Dinosaur World',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.DINOSAURS, sort_by: 'popularity.desc' }
    },
    {
        id: 'high_octane_racing',
        title: 'High Octane Racing',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.RACING, sort_by: 'popularity.desc' }
    },
    {
        id: 'cult_classics',
        title: 'Cult Classics',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.CULT_FILM, sort_by: 'popularity.desc' }
    },
    {
        id: 'silent_era',
        title: 'Silent Era',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.lte': '1929-12-31', sort_by: 'popularity.desc' }
    },

    // --- Standard Movie Genres ---
    { id: 'genre_action_movie', title: 'Action Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.ACTION, sort_by: 'popularity.desc' } },
    { id: 'genre_adventure_movie', title: 'Adventure Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.ADVENTURE, sort_by: 'popularity.desc' } },
    { id: 'genre_animation_movie', title: 'Animation Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.ANIMATION, sort_by: 'popularity.desc' } },
    { id: 'genre_comedy_movie', title: 'Comedy Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.COMEDY, sort_by: 'popularity.desc' } },
    { id: 'genre_crime_movie', title: 'Crime Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.CRIME, sort_by: 'popularity.desc' } },
    { id: 'genre_documentary_movie', title: 'Documentaries', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.DOCUMENTARY, sort_by: 'popularity.desc' } },
    { id: 'genre_drama_movie', title: 'Drama Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.DRAMA, sort_by: 'popularity.desc' } },
    { id: 'genre_family_movie', title: 'Family Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.FAMILY, sort_by: 'popularity.desc' } },
    { id: 'genre_fantasy_movie', title: 'Fantasy Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.FANTASY, sort_by: 'popularity.desc' } },
    { id: 'genre_history_movie', title: 'History Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.HISTORY, sort_by: 'popularity.desc' } },
    { id: 'genre_horror_movie', title: 'Horror Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.HORROR, sort_by: 'popularity.desc' } },
    { id: 'genre_music_movie', title: 'Music Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.MUSIC, sort_by: 'popularity.desc' } },
    { id: 'genre_mystery_movie', title: 'Mystery Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.MYSTERY, sort_by: 'popularity.desc' } },
    { id: 'genre_romance_movie', title: 'Romance Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.ROMANCE, sort_by: 'popularity.desc' } },
    { id: 'genre_scifi_movie', title: 'Sci-Fi Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.SCIENCE_FICTION, sort_by: 'popularity.desc' } },
    { id: 'genre_tv_movie', title: 'TV Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.TV_MOVIE, sort_by: 'popularity.desc' } },
    { id: 'genre_thriller_movie', title: 'Thriller Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.THRILLER, sort_by: 'popularity.desc' } },
    { id: 'genre_war_movie', title: 'War Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.WAR, sort_by: 'popularity.desc' } },
    { id: 'genre_western_movie', title: 'Western Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: GENRES.WESTERN, sort_by: 'popularity.desc' } },

    // --- Standard TV Genres ---
    { id: 'genre_action_adventure_tv', title: 'Action & Adventure TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.ACTION_ADVENTURE, sort_by: 'popularity.desc' } },
    { id: 'genre_animation_tv', title: 'Animation TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.ANIMATION, sort_by: 'popularity.desc' } },
    { id: 'genre_comedy_tv', title: 'Comedy TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.COMEDY, sort_by: 'popularity.desc' } },
    { id: 'genre_crime_tv', title: 'Crime TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.CRIME, sort_by: 'popularity.desc' } },
    { id: 'genre_documentary_tv', title: 'Documentary TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.DOCUMENTARY, sort_by: 'popularity.desc' } },
    { id: 'genre_drama_tv', title: 'Drama TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.DRAMA, sort_by: 'popularity.desc' } },
    { id: 'genre_family_tv', title: 'Family TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.FAMILY, sort_by: 'popularity.desc' } },
    { id: 'genre_kids_tv', title: 'Kids TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.KIDS, sort_by: 'popularity.desc' } },
    { id: 'genre_mystery_tv', title: 'Mystery TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.MYSTERY, sort_by: 'popularity.desc' } },
    { id: 'genre_news_tv', title: 'News TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.NEWS, sort_by: 'popularity.desc' } },
    { id: 'genre_reality_tv', title: 'Reality TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.REALITY, sort_by: 'popularity.desc' } },
    { id: 'genre_scififantasy_tv', title: 'Sci-Fi & Fantasy TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.SCI_FI_FANTASY, sort_by: 'popularity.desc' } },
    { id: 'genre_soap_tv', title: 'Soap Operas', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.SOAP, sort_by: 'popularity.desc' } },
    { id: 'genre_talk_tv', title: 'Talk Shows', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.TALK, sort_by: 'popularity.desc' } },
    { id: 'genre_warpolitics_tv', title: 'War & Politics TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.WAR_POLITICS, sort_by: 'popularity.desc' } },
    { id: 'genre_western_tv', title: 'Western TV', type: 'tv', endpoint: '/discover/tv', params: { with_genres: GENRES.WESTERN, sort_by: 'popularity.desc' } },

    // --- User Requested Specifics ---
    {
        id: 'period_pieces',
        title: 'Period Pieces',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: `${GENRES.DRAMA},${GENRES.HISTORY}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'independent_spirit',
        title: 'Independent Spirit',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.INDIE, sort_by: 'vote_average.desc', 'vote_count.gte': 100 }
    },
    {
        id: 'scifi_fantasy_movies',
        title: 'Sci-Fi & Fantasy Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: `${GENRES.SCIENCE_FICTION},${GENRES.FANTASY}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'anime_movies',
        title: 'Anime Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.ANIMATION, with_original_language: 'ja', sort_by: 'popularity.desc' }
    },
    {
        id: 'comedy_movies',
        title: 'Comedy Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.COMEDY, sort_by: 'popularity.desc' }
    },
    {
        id: 'korean_tv',
        title: 'Korean TV Shows',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_original_language: 'ko', sort_by: 'popularity.desc' }
    },
    {
        id: 'inspiring_movies',
        title: 'Inspiring Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: `${GENRES.DRAMA},${GENRES.FAMILY}`, sort_by: 'vote_average.desc', 'vote_count.gte': 200 }
    },
    {
        id: 'tv_scifi_fantasy',
        title: 'TV Sci-Fi & Fantasy',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.SCI_FI_FANTASY, sort_by: 'popularity.desc' }
    },
    {
        id: 'film_sets_india',
        title: 'Films Set in India',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.INDIA, sort_by: 'popularity.desc' }
    },
    {
        id: 'indian_gangster',
        title: 'Indian Crime & Action',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_original_language: 'hi', with_genres: `${GENRES.CRIME},${GENRES.ACTION}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'one_person_army',
        title: 'One Person Army',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.ONE_PERSON_ARMY, sort_by: 'popularity.desc' }
    },
    {
        id: 'political_tv',
        title: 'Political TV Shows',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.WAR_POLITICS, sort_by: 'popularity.desc' }
    },
    {
        id: 'casual_viewing',
        title: 'Casual Viewing',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.REALITY, sort_by: 'popularity.desc' }
    },
    {
        id: '30min_laughs',
        title: '30-Minute Laughs',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.COMEDY, with_runtime_lte: 35, sort_by: 'popularity.desc' }
    },

    // --- Expanded Categories ---
    {
        id: 'top_rated_movies',
        title: 'Critically Acclaimed Movies',
        type: 'movie',
        endpoint: '/movie/top_rated',
        params: {}
    },
    {
        id: 'top_rated_tv',
        title: 'Critically Acclaimed TV',
        type: 'tv',
        endpoint: '/tv/top_rated',
        params: {}
    },
    {
        id: 'action_thrillers',
        title: 'Adrenaline Rush',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: `${GENRES.ACTION},${GENRES.THRILLER}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'romantic_comedies',
        title: 'Romantic Comedies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.ROMANCE, with_keywords: KEYWORDS.ROMANTIC_COMEDY, sort_by: 'popularity.desc' }
    },
    {
        id: 'dark_comedies',
        title: 'Dark Comedies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.COMEDY, with_keywords: KEYWORDS.DARK_COMEDY, sort_by: 'popularity.desc' }
    },
    {
        id: 'cyberpunk_world',
        title: 'Cyberpunk Worlds',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.CYBERPUNK, sort_by: 'popularity.desc' }
    },
    {
        id: 'dystopian_futures',
        title: 'Dystopian Futures',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.DYSTOPIA, sort_by: 'popularity.desc' }
    },
    {
        id: 'time_travel_trips',
        title: 'Time Travel Trips',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.TIME_TRAVEL, sort_by: 'popularity.desc' }
    },
    {
        id: 'space_operas',
        title: 'Space Operas',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.SPACE_OPERA, sort_by: 'popularity.desc' }
    },
    {
        id: 'superhero_movies',
        title: 'Superhero Universes',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.SUPERHERO, sort_by: 'popularity.desc' }
    },
    {
        id: 'zombie_apocalypse',
        title: 'Zombie Apocalypse',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: `${KEYWORDS.ZOMBIE}|${KEYWORDS.ZOMBIE_APOCALYPSE}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'vampire_chronicles',
        title: 'Vampire Chronicles',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.VAMPIRE, sort_by: 'popularity.desc' }
    },
    {
        id: 'martial_arts_masters',
        title: 'Martial Arts Masters',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.MARTIAL_ARTS, sort_by: 'popularity.desc' }
    },
    {
        id: 'neo_noir',
        title: 'Neo-Noir & Crime',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.NOIR, sort_by: 'popularity.desc' }
    },
    {
        id: 'based_on_true_story',
        title: 'Based on True Stories',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.TRUE_STORY, sort_by: 'popularity.desc' }
    },
    {
        id: 'whodunit',
        title: 'Whodunit Mysteries',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.MYSTERY, sort_by: 'popularity.desc' }
    },
    {
        id: 'slasher_horror',
        title: 'Slasher Horror',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.HORROR, with_keywords: KEYWORDS.SLASHER, sort_by: 'popularity.desc' }
    },
    {
        id: 'family_animation',
        title: 'Family Animation',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: `${GENRES.ANIMATION},${GENRES.FAMILY}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'epic_adventures',
        title: 'Epic Adventures',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.ADVENTURE, 'with_runtime.gte': 140, sort_by: 'popularity.desc' }
    },
    {
        id: 'survival_stories',
        title: 'Survival Stories',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.SURVIVAL, sort_by: 'popularity.desc' }
    },
    {
        id: 'revenge_thrillers',
        title: 'Revenge Thrillers',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.REVENGE, sort_by: 'popularity.desc' }
    },
    {
        id: 'coming_of_age',
        title: 'Coming of Age',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.COMING_OF_AGE, sort_by: 'popularity.desc' }
    },
    {
        id: 'hidden_gems_movies',
        title: 'Hidden Gems (Movies)',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'vote_count.gte': 50, 'vote_count.lte': 500, 'vote_average.gte': 7.5, sort_by: 'vote_average.desc' }
    },
    {
        id: 'hidden_gems_tv',
        title: 'Hidden Gems (TV)',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { 'vote_count.gte': 50, 'vote_count.lte': 500, 'vote_average.gte': 7.5, sort_by: 'vote_average.desc' }
    },
    {
        id: 'miniseries',
        title: 'Binge-Worthy Miniseries',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.DRAMA, 'vote_average.gte': 8, 'vote_count.gte': 100, sort_by: 'popularity.desc' }
    },
    {
        id: 'sitcoms',
        title: 'Classic Sitcoms',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.COMEDY, 'first_air_date.lte': '2005-01-01', sort_by: 'popularity.desc' }
    },
    {
        id: 'standup_comedy',
        title: 'Stand-Up Comedy',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_keywords: KEYWORDS.STANDUP, sort_by: 'popularity.desc' }
    },
    {
        id: 'docuseries',
        title: 'Docuseries',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.DOCUMENTARY, sort_by: 'popularity.desc' }
    },
    {
        id: 'kids_cartoons',
        title: 'Kids & Cartoons',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: `${GENRES.ANIMATION},${GENRES.KIDS}`, sort_by: 'popularity.desc' }
    },
    {
        id: 'reality_tv',
        title: 'Reality TV',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.REALITY, sort_by: 'popularity.desc' }
    },
    {
        id: 'soap_operas',
        title: 'Soap Operas',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.SOAP, sort_by: 'popularity.desc' }
    },
    {
        id: 'talk_shows',
        title: 'Talk Shows',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.TALK, sort_by: 'popularity.desc' }
    },
    {
        id: 'war_politics',
        title: 'War & Politics',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.WAR_POLITICS, sort_by: 'popularity.desc' }
    },
    {
        id: 'french_cinema',
        title: 'French Cinema',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_original_language: 'fr', sort_by: 'popularity.desc' }
    },
    {
        id: 'japanese_cinema',
        title: 'Japanese Cinema',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_original_language: 'ja', sort_by: 'popularity.desc' }
    },
    {
        id: 'spanish_cinema',
        title: 'Spanish Language Hits',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_original_language: 'es', sort_by: 'popularity.desc' }
    },
    {
        id: 'bollywood_hits',
        title: 'Bollywood Hits',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    },
    {
        id: 'classic_movies',
        title: 'Golden Age Classics',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.lte': '1970-01-01', sort_by: 'popularity.desc' }
    },
    {
        id: '80s_nostalgia',
        title: '80s Nostalgia',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.gte': '1980-01-01', 'primary_release_date.lte': '1989-12-31', sort_by: 'popularity.desc' }
    },
    {
        id: '90s_favorites',
        title: '90s Favorites',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31', sort_by: 'popularity.desc' }
    },
    {
        id: 'short_films',
        title: 'Short Films',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { 'with_runtime.lte': 40, sort_by: 'popularity.desc' }
    },
    {
        id: 'monster_movies',
        title: 'Monster Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.MONSTER, sort_by: 'popularity.desc' }
    },
    {
        id: 'heist_movies',
        title: 'The Perfect Heist',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.HEIST, sort_by: 'popularity.desc' }
    },
    {
        id: 'sports_dramas',
        title: 'Sports Dramas',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.DRAMA, with_keywords: KEYWORDS.SPORTS, sort_by: 'popularity.desc' }
    },
    {
        id: 'musical_movies',
        title: 'Musicals',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.MUSIC, sort_by: 'popularity.desc' }
    },
    {
        id: 'war_movies',
        title: 'War Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.WAR, sort_by: 'popularity.desc' }
    },
    {
        id: 'westerns',
        title: 'Westerns',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.WESTERN, sort_by: 'popularity.desc' }
    },
    {
        id: 'history_movies',
        title: 'Historical Dramas',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_genres: GENRES.HISTORY, sort_by: 'popularity.desc' }
    },
    {
        id: 'biographies',
        title: 'Biographies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.BIOGRAPHY, sort_by: 'popularity.desc' }
    },
    {
        id: 'road_trip_movies',
        title: 'Road Trip Movies',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.ROAD_TRIP, sort_by: 'popularity.desc' }
    },
    {
        id: 'high_school_drama',
        title: 'High School Drama',
        type: 'movie',
        endpoint: '/discover/movie',
        params: { with_keywords: KEYWORDS.HIGH_SCHOOL, sort_by: 'popularity.desc' }
    },
    {
        id: 'cooking_shows',
        title: 'Culinary Delights',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_keywords: KEYWORDS.COOKING, sort_by: 'popularity.desc' }
    },
    {
        id: 'mystery_series',
        title: 'Mystery Series',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.MYSTERY, sort_by: 'popularity.desc' }
    },
    {
        id: 'crime_series',
        title: 'Crime Series',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.CRIME, sort_by: 'popularity.desc' }
    },
    {
        id: 'family_tv',
        title: 'Family TV',
        type: 'tv',
        endpoint: '/discover/tv',
        params: { with_genres: GENRES.FAMILY, sort_by: 'popularity.desc' }
    }
];
