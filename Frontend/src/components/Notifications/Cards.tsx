import { useEffect, useState } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";
import { useNotificationStore, type Notification } from "./notificationStore";

export function NotificationCard({ noti }: { noti: Notification }) {
    const removeNotification = useNotificationStore((state) => state.removeNotification);
    const [isVisible, setIsVisible] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation after mount
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleRemove = () => {
        setIsRemoving(true);
        // Wait for animation to finish before removing from store
        setTimeout(() => {
            removeNotification(noti.id);
        }, 300); // Match duration-300
    };

    return (
        <div
            className={`
                relative basis-[8vh] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-lg shadow-md 
                transition-all duration-300 ease-in-out hover:scale-[1.02]
                ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-[100%] opacity-0'}
                ${isRemoving ? 'scale-150 opacity-0 blur-md' : ''}
            `}
        >
            <div className="flex gap-2 pr-5 items-center h-full">
                <div className="flex-shrink-0">
                    {noti.type === "error" ? (
                        <CircleX className="text-red-500 size-5" />
                    ) : (
                        <CircleCheck className="text-green-500 size-5" />
                    )}
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-sm font-medium text-[var(--text-primary)]">{noti.text}</h1>
                    {noti.subtext && (
                        <h2 className="text-xs text-[var(--text-muted)] mt-0.5">{noti.subtext}</h2>
                    )}
                </div>
            </div>

            <button
                className="absolute top-1 right-1 p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                onClick={handleRemove}
            >
                <X className="size-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
            </button>
        </div>
    )
}

export default function NotificationBox() {
    const notifications = useNotificationStore((state) => state.notifications);

    return (
        <div className="flex flex-col gap-3 w-80 fixed bottom-4 right-4 z-50 pointer-events-none">
            <div className="flex flex-col-reverse gap-3 pointer-events-auto">
                {notifications.map((notification) => (
                    <NotificationCard key={notification.id} noti={notification} />
                ))}
            </div>
        </div>
    )
}