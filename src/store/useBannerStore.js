import { create } from 'zustand';

const useBannerStore = create((set) => ({
    bannerMovie: null,
    setBannerMovie: (movie) => set({ bannerMovie: movie }),
}));

export default useBannerStore;
