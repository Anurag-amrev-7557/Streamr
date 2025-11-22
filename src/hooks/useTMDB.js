import { useQuery } from '@tanstack/react-query';
import tmdb from '../lib/tmdb';
import requests from '../lib/requests';

export const useTrending = () => {
    return useQuery({
        queryKey: ['trending'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchTrending);
            return data.results;
        }
    });
};

export const useNetflixOriginals = () => {
    return useQuery({
        queryKey: ['netflixOriginals'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchNetflixOriginals);
            return data.results;
        }
    });
};

export const useRowData = (fetchUrl, title) => {
    return useQuery({
        queryKey: ['row', title, fetchUrl],
        queryFn: async () => {
            const { data } = await tmdb.get(fetchUrl);
            return data.results;
        },
        enabled: !!fetchUrl,
    });
};

export const useMovieImages = (movieId, type = 'movie') => {
    return useQuery({
        queryKey: ['images', type, movieId],
        queryFn: async () => {
            const endpoint = type === 'tv'
                ? `/tv/${movieId}/images`
                : `/movie/${movieId}/images`;
            const { data } = await tmdb.get(endpoint);
            return data;
        },
        enabled: !!movieId,
        retry: false,
    });
};
