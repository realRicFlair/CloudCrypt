import { create } from 'zustand';
import { getUsage } from '../api';

interface UsageState {
    totalBytes: number;
    fileCount: number;
    isLoading: boolean;
    error: string | null;
    fetchUsage: () => Promise<void>;
}

export const useUsageStore = create<UsageState>((set) => ({
    totalBytes: 0,
    fileCount: 0,
    isLoading: false,
    error: null,
    fetchUsage: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await getUsage();
            set({
                totalBytes: response.data.total_bytes,
                fileCount: response.data.file_count,
                isLoading: false,
            });
        } catch (error) {
            console.error("Failed to fetch usage stats:", error);
            set({
                isLoading: false,
                error: "Failed to fetch usage stats",
            });
        }
    },
}));
