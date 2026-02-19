import { create } from 'zustand';

type FileState = {
    refreshTrigger: number;
    triggerRefresh: () => void;
    reset: () => void;
};

export const useFileStore = create<FileState>((set) => ({
    refreshTrigger: 0,

    triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

    reset: () => set({ refreshTrigger: 0 }),
}));
