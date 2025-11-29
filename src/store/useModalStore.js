import { create } from 'zustand';
// Store for managing modal state

const useModalStore = create((set) => ({
    isModalOpen: false,
    modalType: 'movie', // 'movie' | 'tv'
    activeTab: 'overview', // 'overview' | 'seasons' | 'similar'
    onCloseHandler: null, // Handler set by Modal component to properly close

    // Cast Modal State
    isCastModalOpen: false,
    selectedPerson: null,

    openModal: (type = 'movie') => set({
        isModalOpen: true,
        modalType: type,
        activeTab: 'overview'
    }),

    closeModal: () => set({
        isModalOpen: false,
        // Don't reset activeTab here to avoid visual jumps during exit animation
        // It will be reset by openModal anyway
    }),

    openCastModal: (person) => set({
        isCastModalOpen: true,
        selectedPerson: person,
        activeCastTab: 'overview'
    }),

    closeCastModal: () => set({
        isCastModalOpen: false,
        selectedPerson: null
    }),

    setOnCloseHandler: (handler) => set({ onCloseHandler: handler }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    setActiveCastTab: (tab) => set({ activeCastTab: tab }),

    playerState: { isOpen: false, type: 'movie', season: 1, episode: 1 },
    setPlayerState: (state) => set((prev) => ({ playerState: { ...prev.playerState, ...state } })),
    closePlayer: () => set((prev) => ({ playerState: { ...prev.playerState, isOpen: false } })),
}));

export default useModalStore;
