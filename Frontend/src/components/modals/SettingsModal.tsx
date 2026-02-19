import { useState } from "react";
import { X, ShieldCheck, Key, AlertTriangle } from "lucide-react";
import { Button, IconButton, Panel } from "../ui";
import { swapKeyMode } from "../../api";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../Notifications/notificationStore";
import { cn } from "../../lib/utils";

interface SettingsModalProps {
    onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
    const { user } = useAuthStore();
    const [mode, setMode] = useState<"server" | "user">(user?.key_stored ? "server" : "user");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [downloadKey, setDownloadKey] = useState<string | null>(null);

    const handleSwap = async () => {
        if (mode === (user?.key_stored ? "server" : "user")) return; // No change

        setLoading(true);
        try {
            const res = await swapKeyMode(mode, password);

            if (mode === "user" && res.data.key) {
                setDownloadKey(res.data.key);
                // We should also ensure the client state is updated
                // user.key_stored = false; // need context update
                // Also update local encryption key in context if we want to stay logged in?
                // Actually, if we switch to User managed, we need to KNOW the key. The server returned it.
                // We should explicitly set it in memory so the session continues working?
                // But the user might want to save it.
            } else {
                // If switching to server, server has the key now.
                // user.key_stored = true;
                window.location.reload();
            }
            useNotificationStore.getState().addNotification("Mode switched successfully!", "success");
        } catch (err: any) {
            useNotificationStore.getState().addNotification(err.response?.data?.error || "Swap failed", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Panel variant="elevated" padding="none" className="w-[90vw] max-w-[500px] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0">Security Settings</h2>
                    <IconButton onClick={onClose} label="Close">
                        <X size={20} />
                    </IconButton>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex gap-4 mb-6">
                        <div
                            className={cn(
                                "flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2",
                                mode === "server"
                                    ? "border-[var(--accent-primary)] bg-[var(--bg-hover)] text-[var(--accent-primary)]"
                                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                            )}
                            onClick={() => setMode("server")}
                        >
                            <ShieldCheck size={24} />
                            <div>
                                <div className="font-semibold text-sm">Server Managed</div>
                                <div className="text-xs opacity-80 mt-1">Convenient. Key stored on server.</div>
                            </div>
                        </div>

                        <div
                            className={cn(
                                "flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2",
                                mode === "user"
                                    ? "border-[var(--accent-primary)] bg-[var(--bg-hover)] text-[var(--accent-primary)]"
                                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                            )}
                            onClick={() => setMode("user")}
                        >
                            <Key size={24} />
                            <div>
                                <div className="font-semibold text-sm">User Managed</div>
                                <div className="text-xs opacity-80 mt-1">Secure. You manage the key.</div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        {mode === "user" && user?.key_stored && (
                            <div className="flex gap-3 p-3 rounded-md bg-[rgba(255,171,0,0.1)] border border-[var(--accent-warning)] text-[var(--accent-warning)] text-sm">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>Warning: You are switching to User Managed mode. You MUST save the key provided next. If you lose it, your data is lost forever.</span>
                            </div>
                        )}
                        {mode === "server" && !user?.key_stored && (
                            <div className="flex gap-3 p-3 rounded-md bg-[rgba(33,150,243,0.1)] border border-[var(--accent-info)] text-[var(--accent-info)] text-sm">
                                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                                <span>Switching to Server Managed. We will securely store your current key.</span>
                            </div>
                        )}
                    </div>

                    {!downloadKey && mode !== (user?.key_stored ? "server" : "user") && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm Password to Swap</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                                placeholder="Enter your password"
                            />
                        </div>
                    )}

                    {downloadKey && (
                        <div className="text-center p-6 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] mb-4">
                            <h3 className="text-lg font-bold text-[var(--accent-success)] mb-2">Your Encryption Key</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">Save this key immediately!</p>
                            <div className="font-mono text-xs bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-subtle)] break-all mb-4 select-all">
                                {downloadKey}
                            </div>
                            <Button onClick={() => {
                                const blob = new Blob([downloadKey], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "cloudcrypt-key.txt";
                                a.click();
                            }}>Download Key File</Button>
                            <div className="mt-3 text-xs text-[var(--text-muted)]">
                                After saving, please refresh the page to log in with your new key.
                            </div>
                        </div>
                    )}


                </div>

                <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex justify-end gap-3 rounded-b-lg">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    {!downloadKey && (
                        <Button
                            onClick={handleSwap}
                            disabled={loading || mode === (user?.key_stored ? "server" : "user") || !password}
                        >
                            {loading ? "Swapping..." : "Confirm Swap"}
                        </Button>
                    )}
                </div>
            </Panel>
        </div>
    );
}
