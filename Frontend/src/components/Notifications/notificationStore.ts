import { create } from 'zustand';

export interface Notification {
    id: number;
    text: string;
    subtext?: string;
    type: "success" | "error";
}

interface NotificationState {
    notifications: Notification[];
    addNotification: (text: string, type: "success" | "error", subtext?: string) => void;
    removeNotification: (id: number) => void;
}

let idCounter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    addNotification: (text, type, subtext) => set((state) => {
        const id = idCounter++;
        setTimeout(() => {
            state.removeNotification(id);
        }, 10 * 1000); //10 seconds
        return {
            notifications: [...state.notifications, { id, text, type, subtext }]
        }
    }),
    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
    })),
}));


