import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useListStore = create(
    persist(
        (set, get) => ({
            list: [],
            addMovie: (movie) => {
                const { list } = get();
                if (!list.some((item) => item.id === movie.id)) {
                    set({ list: [...list, movie] });
                }
            },
            removeMovie: (movieId) => {
                const { list } = get();
                set({ list: list.filter((item) => item.id !== movieId) });
            },
            clearList: () => {
                set({ list: [] });
            },
            isInList: (movieId) => {
                const { list } = get();
                return list.some((item) => item.id === movieId);
            },
        }),
        {
            name: 'my-list-storage', // name of the item in the storage (must be unique)
        }
    )
);

export default useListStore;
