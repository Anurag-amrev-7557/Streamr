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
        description: 'Download, Dubbed',
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
    CINEMAOS: {
        name: 'Cinemaos',
        description: 'Download, Dubbed',
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
    VIDJOY: {
        name: 'VidJoy',
        description: 'Dubbed',
        baseUrl: 'https://vidjoy.pro/embed',
        movieFormat: '/movie/{id}',
        tvFormat: '/tv/{id}/{season}/{episode}',
        quality: '720p',
        autoplay: false,
        preload: 'metadata',
        bandwidth: 'high'
    }
};

export const DEFAULT_STREAMING_SERVICE = 'RIVESTREAM';
