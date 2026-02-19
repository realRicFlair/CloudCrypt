import { useState } from "react";
import { Copy, X, Share2, Lock } from "lucide-react";
import { Button, IconButton, Panel } from "../ui";
import { shareFile } from "../../api";
import { useNotificationStore } from "../Notifications/notificationStore";

interface ShareModalProps {
    file: { name: string; type: 'file' | 'folder'; path: string };
    onClose: () => void;
}

export default function ShareModal({ file, onClose }: ShareModalProps) {
    const [password, setPassword] = useState("");
    const [directDownload, setDirectDownload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);

    const handleShare = async () => {
        setLoading(true);
        try {
            const res = await shareFile(file.path, file.type === 'folder', password, directDownload);
            const link = `${window.location.origin}${res.data.link}`;
            setShareLink(link);
            useNotificationStore.getState().addNotification("Link created!", "success");
        } catch (err: any) {
            useNotificationStore.getState().addNotification(err.response?.data?.error || "Share failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            useNotificationStore.getState().addNotification("Copied to clipboard", "success");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Panel variant="elevated" padding="none" className="w-[90vw] max-w-[450px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0 flex items-center gap-2">
                        <Share2 size={20} className="text-[var(--accent-primary)]" />
                        Share "{file.name}"
                    </h2>
                    <IconButton onClick={onClose} label="Close">
                        <X size={20} />
                    </IconButton>
                </div>

                <div className="p-6 space-y-4">
                    {!shareLink ? (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                        Password Protection (Optional)
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Set a password..."
                                            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm focus:border-[var(--accent-primary)] text-[var(--text-primary)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-[var(--text-primary)]">Direct Download</span>
                                        <span className="text-xs text-[var(--text-muted)]">Skip the preview page</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={directDownload}
                                        onChange={(e) => setDirectDownload(e.target.checked)}
                                        className="accent-[var(--accent-primary)] h-5 w-5"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] break-all">
                                <p className="text-sm text-[var(--text-primary)] font-mono">{shareLink}</p>
                            </div>
                            <Button fullWidth onClick={copyToClipboard} className="flex items-center justify-center gap-2">
                                <Copy size={16} /> Copy Link
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3">
                    {shareLink ? (
                        <Button onClick={onClose}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleShare} disabled={loading} className="min-w-[100px]">
                                {loading ? "Creating..." : "Create Link"}
                            </Button>
                        </>
                    )}
                </div>
            </Panel>
        </div>
    );
}
