import { create } from 'zustand';
import api, { setEncryptionKeyMemory, clearCsrfToken } from '../api';
import { useFileStore } from './fileStore';

export type User = {
    username: string;
    email: string;
    key_stored: boolean;
    profile_pic?: string;
};

type AuthState = {
    isLoggedIn: boolean;
    isLoading: boolean;
    user: User | null;
    encryptionKey: string | null;
    login: (userData: User) => void;
    logout: () => Promise<void>;
    setEncryptionKey: (key: string | null) => void;
    checkSession: () => Promise<void>;
    setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    isLoading: true,
    user: null,
    encryptionKey: null,

    login: (userData) => {
        set({ isLoggedIn: true, user: userData });
    },

    logout: async () => {
        try {
            // Call backend to invalidate session
            await api.post('/auth/logout');
        } catch (error) {
            // Even if backend call fails, still clear local state
            console.error('Logout API call failed:', error);
        }

        // Clear CSRF token from memory
        clearCsrfToken();

        // Clear encryption key from memory
        setEncryptionKeyMemory(null);

        // Clear cookies client-side as backup
        document.cookie = 'session_token=; Max-Age=0; path=/;';
        document.cookie = 'csrf_token=; Max-Age=0; path=/;';

        // Reset file store state
        useFileStore.getState().reset();

        // Reset auth state
        set({
            isLoggedIn: false,
            user: null,
            encryptionKey: null,
            isLoading: false,
        });
    },

    setEncryptionKey: (key) => {
        setEncryptionKeyMemory(key);
        set({ encryptionKey: key });
    },

    checkSession: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/auth/checksession');
            if (res.data.authenticated) {
                set({
                    isLoggedIn: true,
                    user: {
                        username: res.data.username,
                        email: res.data.email,
                        key_stored: res.data.key_stored,
                        profile_pic: res.data.profile_pic,
                    },
                });
            } else {
                set({ isLoggedIn: false, user: null });
            }
        } catch (error) {
            set({ isLoggedIn: false, user: null });
        } finally {
            set({ isLoading: false });
        }
    },

    setUser: (user) => set({ user }),
}));
