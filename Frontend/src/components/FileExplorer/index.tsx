import { RefreshCcw, CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import api from "../../api";
import { useFileStore } from "../../stores/fileStore";
import { useFileUploader } from "../../hooks/useFileUploader";
import { useNotificationStore } from "../Notifications/notificationStore";
import type { FileItem } from "../../types/filetype";
import { ExplorerToolbar } from "./ExplorerToolbar";
import { FileGrid } from "./FileGrid";
import ShareModal from "../modals/ShareModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8443/api/";

// --- Helper Functions for BFS Directory Traversal ---

async function getAllFileEntries(dataTransferItemList: DataTransferItemList): Promise<File[]> {
    const fileEntries: any[] = [];
    const queue: any[] = [];
    const plainFiles: File[] = [];

    for (let i = 0; i < dataTransferItemList.length; i++) {
        const item = dataTransferItemList[i];
        // @ts-ignore - webkitGetAsEntry is standard in modern browsers
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
            queue.push(entry);
        } else if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) plainFiles.push(file);
        }
    }

    while (queue.length > 0) {
        const entry = queue.shift();
        if (entry.isFile) {
            fileEntries.push(entry);
        } else if (entry.isDirectory) {
            const subEntries = await readAllDirectoryEntries(entry.createReader());
            queue.push(...subEntries);
        }
    }

    const filesFromEntries: File[] = await Promise.all(fileEntries.map(entry => new Promise<File>((resolve) => {
        entry.file((file: File) => {
            const path = entry.fullPath.startsWith('/') ? entry.fullPath.slice(1) : entry.fullPath;
            Object.defineProperty(file, 'webkitRelativePath', {
                value: path
            });
            resolve(file);
        }, (err: any) => {
            console.error(err);
            resolve(null as any);
        });
    })));

    return [...plainFiles, ...filesFromEntries.filter(f => f)];
}

async function readAllDirectoryEntries(directoryReader: any) {
    let entries: any[] = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
        entries.push(...readEntries);
        readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
}

async function readEntriesPromise(directoryReader: any): Promise<any[]> {
    try {
        return await new Promise((resolve, reject) => {
            directoryReader.readEntries(resolve, reject);
        });
    } catch (err) {
        console.log(err);
        return [];
    }
}

export default function FileExplorer() {
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<FileItem[]>([]);

    const location = useLocation();
    const navigate = useNavigate();
    const { refreshTrigger } = useFileStore();

    // Derive currentPath from URL: /files/foo/bar → /foo/bar, /files → /
    const currentPath = (() => {
        const pathname = location.pathname;
        if (pathname.startsWith('/files')) {
            const sub = pathname.slice('/files'.length);
            if (sub === '' || sub === '/') return '/';
            // Ensure it starts with /
            return sub.startsWith('/') ? sub : '/' + sub;
        }
        return '/';
    })();

    // Navigation helpers that update the URL
    function setPath(newPath: string) {
        const urlPath = newPath === '/' ? '/files' : '/files' + newPath;
        navigate(urlPath);
    }

    // New State for Selection and Clipboard
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [shareFile, setShareFile] = useState<FileItem | null>(null);

    useEffect(() => { refreshFiles() }, [currentPath, refreshTrigger]);

    // Clear selection when path changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentPath]);

    function refreshFiles() {
        setLoading(true);
        const path = currentPath === "" ? "/" : currentPath;

        api.get('/files/ls', { params: { filepath: path } })
            .then(function (response) {
                const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                if (!data.entries) {
                    setFileList([]);
                    return;
                }

                const mappedFiles: FileItem[] = data.entries.map((entry: any) => ({
                    id: entry.enc,
                    name: entry.name,
                    type: entry.type === "dir" ? "folder" : "file",
                    starred: false,
                    size: entry.size,
                    mimeType: entry.type === "dir" ? "folder" : getMimeTypeFromExtension(entry.name)
                }));
                // Sort folders first
                mappedFiles.sort((a, b) => {
                    if (a.type === b.type) return a.name.localeCompare(b.name);
                    return a.type === "folder" ? -1 : 1;
                });
                setFileList(mappedFiles);
            })
            .catch(function (error: any) {
                console.log(error);
                setFileList([]);
                let errorMessage = "Failed to load files";
                if (error.response && error.response.data) {
                    errorMessage = typeof error.response.data === 'string' ? error.response.data : (error.response.data.message || errorMessage);
                }
                useNotificationStore.getState().addNotification(errorMessage, "error");
            })
            .finally(function () {
                setLoading(false);
            });
    }

    function ToggleStar(fileId: string) {
        setFileList(prev =>
            prev.map(f => f.id === fileId ? { ...f, starred: !f.starred } : f)
        );
    }

    function getMimeTypeFromExtension(filename: string): string {
        const extension = getFileExtension(filename)?.toLowerCase();
        if (!extension) return "file";
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension)) return "image";
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'].includes(extension)) return "video";
        if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(extension)) return "audio";
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) return "zip";
        if (['txt', 'doc', 'docx', 'pdf', 'rtf', 'odt'].includes(extension)) return "text";
        if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift'].includes(extension)) return "code";
        return "file";
    }

    function getFileExtension(filename: string): string | null {
        const lastDotIndex = filename.lastIndexOf(".");
        if (lastDotIndex <= 0 || lastDotIndex === filename.length - 1) return null;
        return filename.slice(lastDotIndex + 1);
    }

    // --- Interaction Handlers ---

    function handleFileClick(file: FileItem, ctrlKey: boolean) {
        if (!file || !file.id) {
            // Clicked on empty space
            setSelectedIds(new Set());
            return;
        }

        setSelectedIds(prev => {
            const next = new Set(ctrlKey ? prev : []);
            if (next.has(file.id)) {
                if (ctrlKey) next.delete(file.id); // Toggle off if ctrl
            } else {
                next.add(file.id);
            }
            return next;
        });
    }

    function handleFileDoubleClick(file: FileItem) {
        if (file.type === "folder") {
            const newPath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name;
            setPath(newPath);
        } else {
            handleSmartDownload(file);
        }
    }

    function handleSmartDownload(file: FileItem) {
        const fullPath = currentPath === "/" ? file.name : currentPath + "/" + file.name;

        // 50MB in bytes = 50 * 1024 * 1024 = 52,428,800 bytes
        const MAX_BLOB_SIZE = 50 * 1024 * 1024;
        const size = file.size || 0;

        if (size > 0 && size < MAX_BLOB_SIZE) {
            // In-memory download (Blob)
            api.get('/files/download', {
                params: { filepath: fullPath },
                responseType: 'blob'
            })
                .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', file.name);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode?.removeChild(link);
                    window.URL.revokeObjectURL(url);
                })
                .catch((err: any) => {
                    console.error("Blob download failed", err);
                    let errorMessage = "Failed to download file via memory.";
                    if (err.response && err.response.data) {
                        errorMessage = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || errorMessage);
                    }
                    useNotificationStore.getState().addNotification(errorMessage, "error");
                });
        } else {
            // Large file or Folder -> Token based download
            api.post('/files/prepare-download', null)
                .then(response => {
                    const token = response.data.token;
                    let endpoint = 'files/download';
                    if (file.type === 'folder') {
                        endpoint = 'files/download-folder';
                    }
                    let downloadUrl = `${API_URL}${endpoint}?filepath=${encodeURIComponent(fullPath)}&token=${token}`;

                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = file.name; // Hint
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                })
                .catch((error: any) => {
                    console.error("Failed to prepare download", error);
                    let errorMessage = "Failed to download file.";
                    if (error.response && error.response.data) {
                        errorMessage = typeof error.response.data === 'string' ? error.response.data : (error.response.data.message || errorMessage);
                    }
                    useNotificationStore.getState().addNotification(errorMessage, "error");
                });
        }
    }

    function directoryUp() {
        if (currentPath === "/") return;
        const segments = currentPath.split('/').filter(segment => segment !== '');
        if (segments.length === 0) {
            setPath('/');
            return;
        }
        const parentPath = '/' + segments.slice(0, -1).join('/');
        setPath(parentPath || '/');
    }

    // --- Toolbar Handlers ---

    function handleCreateFolder() {
        const name = prompt("Enter folder name:");
        if (!name) return;

        const path = currentPath === "/" ? name : currentPath + "/" + name;
        api.post('/files/create-folder', { path })
            .then(() => {
                refreshFiles();
                useNotificationStore.getState().addNotification("Folder created", "success");
            })
            .catch((err: any) => {
                console.error(err);
                let errorMessage = "Failed to create folder";
                if (err.response && err.response.data) {
                    errorMessage = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || errorMessage);
                }
                useNotificationStore.getState().addNotification(errorMessage, "error");
            });
    }

    function handleDelete(file?: FileItem) {
        let filesToDelete: FileItem[] = [];

        if (file) {
            filesToDelete = [file];
        } else {
            filesToDelete = fileList.filter(f => selectedIds.has(f.id));
        }

        if (filesToDelete.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${filesToDelete.length} item(s)?`)) return;

        const deletePromises = filesToDelete.map(f => {
            const fullPath = currentPath === "/" ? f.name : currentPath + "/" + f.name;
            return api.delete(`/files/delete`, { params: { path: fullPath } });
        });

        Promise.all(deletePromises)
            .then(() => {
                setSelectedIds(new Set()); // Clear selection
                refreshFiles();
                useNotificationStore.getState().addNotification(`Successfully deleted ${filesToDelete.length} items`, "success");
            })
            .catch((err: any) => {
                console.error(err);
                let errorMessage = "Failed to delete some items";
                if (err.response && err.response.data) {
                    errorMessage = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || errorMessage);
                }
                useNotificationStore.getState().addNotification(errorMessage, "error");
                refreshFiles();
            });
    }

    function handleRename(file: FileItem) {
        const newName = prompt("Enter new name:", file.name);
        if (!newName || newName === file.name) return;

        const oldPath = currentPath === "/" ? file.name : currentPath + "/" + file.name;
        api.post('/files/rename', { oldPath, newName })
            .then(() => {
                refreshFiles();
                useNotificationStore.getState().addNotification("Item renamed", "success");
            })
            .catch((err: any) => {
                console.error(err);
                let errorMessage = "Failed to rename item";
                if (err.response && err.response.data) {
                    errorMessage = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || errorMessage);
                }
                useNotificationStore.getState().addNotification(errorMessage, "error");
            });
    }

    function handleDownloadSelection() {
        const selectedFiles = fileList.filter(f => selectedIds.has(f.id));
        selectedFiles.forEach(file => {
            handleSmartDownload(file);
        });
    }

    function handleShare(file: FileItem) {
        setShareFile(file);
    }


    // Correction for clipboard to support paths
    const [clipboardPaths, setClipboardPaths] = useState<string[]>([]);

    function handleCopySelectionCorrected() {
        const selectedFiles = fileList.filter(f => selectedIds.has(f.id));
        if (selectedFiles.length === 0) return;

        const paths = selectedFiles.map(f => currentPath === "/" ? f.name : currentPath + "/" + f.name);
        setClipboardPaths(paths);
    }

    function handlePasteCorrected() {
        if (clipboardPaths.length === 0) return;

        const destination = currentPath;

        api.post('/files/copy', { sources: clipboardPaths, destination })
            .then(() => {
                refreshFiles();
                useNotificationStore.getState().addNotification(`Pasted ${clipboardPaths.length} items`, "success");
            })
            .catch((err: any) => {
                console.error(err);
                let errorMessage = "Failed to paste items";
                if (err.response && err.response.data) {
                    errorMessage = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || errorMessage);
                }
                useNotificationStore.getState().addNotification(errorMessage, "error");
            });
    }

    // --- Drag & Drop Handlers ---
    const [isDragging, setIsDragging] = useState(false);
    const { uploadFiles } = useFileUploader();

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes("Files")) {
            setIsDragging(true);
        }
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Check if leaving the window or just a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    }

    async function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (!items) return;

        const filesToUpload = await getAllFileEntries(items);

        if (filesToUpload.length > 0) {
            uploadFiles(filesToUpload);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center flex-1 h-full font-mono text-[var(--accent-primary)]">
                <RefreshCcw size={32} className="animate-spin" />
            </div>
        );
    }

    return (
        <div
            className="flex flex-col flex-1 h-full overflow-hidden p-6 gap-6 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 rounded-lg bg-[var(--bg-base)]/80 backdrop-blur-sm border-2 border-dashed border-[var(--accent-primary)] flex flex-col items-center justify-center text-[var(--accent-primary)] pointer-events-none">
                    <CloudUpload size={64} className="mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold">Drop files here to upload</h2>
                </div>
            )}

            <ExplorerToolbar
                currentPath={currentPath}
                selectedCount={selectedIds.size}
                hasClipboard={clipboardPaths.length > 0}
                onNavigateHome={() => setPath("/")}
                onRefresh={refreshFiles}
                onCreateFolder={handleCreateFolder}
                onNavigateUp={directoryUp}
                onDownload={handleDownloadSelection}
                onCopy={handleCopySelectionCorrected}
                onDelete={() => handleDelete()}
                onPaste={handlePasteCorrected}
            />

            <FileGrid
                fileList={fileList}
                currentPath={currentPath}
                selectedIds={selectedIds}
                onToggleStar={ToggleStar}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDelete={handleDelete}
                onRename={handleRename}
                onShare={handleShare}
            />

            {shareFile && (
                <ShareModal
                    file={{
                        name: shareFile.name,
                        type: shareFile.type,
                        path: currentPath === "/" ? shareFile.name : currentPath + "/" + shareFile.name
                    }}
                    onClose={() => setShareFile(null)}
                />
            )}
        </div>
    );
}
