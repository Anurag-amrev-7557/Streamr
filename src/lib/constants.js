/**
 * Configuration for available streaming services.
 * Each service includes metadata and URL formats for movies and TV shows.
 */
export const STREAMING_SERVICES = {
    MOVIES111: {
        name: '111Movies',
        description: 'Fastest',
        baseUrl: 'https://111movies.com',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    RIVESTREAM: {
        name: 'RiveStream',
        description: 'Dubbed',
        baseUrl: 'https://rivestream.net/embed',
        movieFormat: '?type=movie&id={id}',
        tvFormat: '?type=tv&id={id}&season={season}&episode={episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    VIDFAST: {
        name: 'VidFast',
        description: 'Ad-free',
        baseUrl: 'https://vidfast.pro',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'auto',
        bandwidth: 'high'
    },
    VIDZEE: {
        name: 'VidZee',
        description: 'Dubbed',
        baseUrl: 'https://player.vidzee.wtf/embed',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    CINEMAOS: {
        name: 'Cinemaos',
        description: 'Dubbed',
        baseUrl: 'https://cinemaos.tech/player',
        movieFormat: '/{id}',
        tvFormat: '/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'auto',
        bandwidth: 'high'
    },
    VIDEASY: {
        name: 'Videasy',
        description: 'Fast',
        baseUrl: 'https://player.videasy.net',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '720p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    VIDKING: {
        name: 'VidKing',
        description: 'Fast',
        baseUrl: 'https://www.vidking.net/embed',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    VIDSRC_CC: {
        name: 'VidSrc.cc',
        description: 'Multi-source',
        baseUrl: 'https://vidsrc.cc/v3/embed',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    },
    AUTOEMBED: {
        name: 'AutoEmbed',
        description: 'Fast',
        baseUrl: 'https://player.autoembed.cc/embed',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '1080p',
        autoplay: true,
        preload: 'metadata',
        bandwidth: 'high'
    }
};

/**
 * The key of the default streaming service to use.
 * Must match a key in STREAMING_SERVICES.
 */
export const DEFAULT_STREAMING_SERVICE = 'MOVIES111';
