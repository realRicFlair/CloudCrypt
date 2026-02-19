import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getShareInfo, downloadSharedFile } from "../api";
import { Button, Input, Panel } from "./ui";
import { File, Folder, Lock, AlertCircle } from "lucide-react";
import { useNotificationStore } from "./Notifications/notificationStore";

interface ShareInfo {
    filename: string;
    is_encrypted: boolean;
    is_folder: boolean;
    direct_download: boolean;
    created_at: string;
    downloads: number;
}

export default function DownloadPage() {
    const { shareId } = useParams();
    const [info, setInfo] = useState<ShareInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!shareId) return;
        fetchInfo();
    }, [shareId]);

    const fetchInfo = async () => {
        try {
            const res = await getShareInfo(shareId!);
            setInfo(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Share not found or expired");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!shareId || !info) return;
        setDownloading(true);
        try {
            const res = await downloadSharedFile(shareId, password);
            // Create blob link
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', info.filename + (info.is_folder && !info.filename.endsWith('.zip') && !info.filename.endsWith('.rar') ? '.zip' : ''));
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Update downloads count locally
            setInfo(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);

        } catch (err: any) {
            useNotificationStore.getState().addNotification(err.response?.data?.error || "Download failed. Check password?", "error");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">Loading...</div>;

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
                <Panel variant="elevated" className="max-w-md w-full text-center p-8 space-y-4">
                    <AlertCircle size={48} className="mx-auto text-[var(--accent-danger)]" />
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">Link Expired or Invalid</h1>
                    <p className="text-[var(--text-secondary)]">{error}</p>
                </Panel>
            </div>
        );
    }

    if (!info) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <Panel variant="elevated" className="max-w-md w-full p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--border-subtle)]">
                        {info.is_folder ? <Folder size={32} className="text-[var(--accent-primary)]" /> : <File size={32} className="text-[var(--accent-primary)]" />}
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] break-all">{info.filename}</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Shared via CloudCrypt • {info.downloads} downloads
                    </p>
                </div>

                {info.is_encrypted && (
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-3">
                        <div className="flex items-center gap-2 text-[var(--accent-warning)] text-sm font-medium">
                            <Lock size={16} /> Password Protected
                        </div>
                        <Input
                            type="password"
                            placeholder="Enter password..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                        />
                    </div>
                )}

                <Button
                    fullWidth
                    onClick={handleDownload}
                    disabled={downloading || (info.is_encrypted && !password)}
                    className="h-12 text-lg font-medium"
                >
                    {downloading ? "Downloading..." : "Download File"}
                </Button>
            </Panel>
        </div>
    );
}
