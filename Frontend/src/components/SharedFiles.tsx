import { useEffect, useState } from "react";
import { getSharedFiles, unshareFile } from "../api";
import { Copy, Trash2, File, Folder, ExternalLink } from "lucide-react";
import { IconButton } from "./ui";
import { useNotificationStore } from "./Notifications/notificationStore";

interface SharedFile {
    ID: number;
    UserID: number;
    FileID: string;
    OriginalFilename: string;
    StoredFilename: string;
    IsEncrypted: boolean;
    IsFolder: boolean;
    DirectDownload: boolean;
    Downloads: number;
    CreatedAt: string;
}

export default function SharedFiles() {
    const [files, setFiles] = useState<SharedFile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFiles = async () => {
        try {
            const res = await getSharedFiles();
            setFiles(res.data || []);
        } catch (err) {
            console.error(err);
            useNotificationStore.getState().addNotification("Failed to fetch shared files", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleUnshare = async (shareId: string) => {
        if (!confirm("Are you sure you want to stop sharing this file? The link will stop working.")) return;
        try {
            await unshareFile(shareId);
            setFiles(files.filter(f => f.FileID !== shareId));
            useNotificationStore.getState().addNotification("Unshared successfully", "success");
        } catch (err) {
            useNotificationStore.getState().addNotification("Failed to unshare", "error");
        }
    };

    const copyLink = (shareId: string) => {
        const link = `${window.location.origin}/share/${shareId}`;
        navigator.clipboard.writeText(link);
        useNotificationStore.getState().addNotification("Link copied", "success");
    };

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading shared files...</div>;

    return (
        <div className="p-6 h-full overflow-y-auto w-full">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Shared Files</h1>

            {files.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] mt-12 bg-[var(--bg-secondary)] p-8 rounded-xl border border-[var(--border-subtle)]">
                    <p>You haven't shared any files yet.</p>
                </div>
            ) : (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                            <tr>
                                <th className="p-4 font-medium text-[var(--text-secondary)]">Name</th>
                                <th className="p-4 font-medium text-[var(--text-secondary)]">Downloads</th>
                                <th className="p-4 font-medium text-[var(--text-secondary)]">Created</th>
                                <th className="p-4 font-medium text-[var(--text-secondary)] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {files.map(file => (
                                <tr key={file.ID} className="group hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {file.IsFolder ? <Folder size={20} className="text-[var(--accent-primary)]" /> : <File size={20} className="text-[var(--text-muted)]" />}
                                            <span className="font-medium text-[var(--text-primary)]">{file.OriginalFilename}</span>
                                            {file.IsEncrypted && <span className="px-2 py-0.5 text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded border border-[var(--border-subtle)]">Encrypted</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-[var(--text-secondary)]">{file.Downloads}</td>
                                    <td className="p-4 text-[var(--text-secondary)]">{new Date(file.CreatedAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <IconButton onClick={() => copyLink(file.FileID)} label="Copy Link">
                                                <Copy size={16} />
                                            </IconButton>
                                            <IconButton onClick={() => window.open(`/share/${file.FileID}`, '_blank')} label="Open">
                                                <ExternalLink size={16} />
                                            </IconButton>
                                            <IconButton onClick={() => handleUnshare(file.FileID)} label="Stop Sharing" className="text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10">
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
