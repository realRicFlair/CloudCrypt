import { useState } from 'react';
import { useLocation } from 'react-router';
import api from '../api';
import { useFileStore } from '../stores/fileStore';
import { useNotificationStore } from '../components/Notifications/notificationStore';

export interface UploadStats {
    totalFiles: number;
    uploadedFiles: number;
    currentFileName: string;
    progress: number; // 0-100 for current file
    uploading: boolean;
}

export function useFileUploader() {
    const [stats, setStats] = useState<UploadStats>({
        totalFiles: 0,
        uploadedFiles: 0,
        currentFileName: '',
        progress: 0,
        uploading: false,
    });

    const location = useLocation();
    const { triggerRefresh } = useFileStore();

    // Derive currentPath from URL: /files/foo/bar → /foo/bar, /files → /
    function getCurrentPath(): string {
        const pathname = location.pathname;
        if (pathname.startsWith('/files')) {
            const sub = pathname.slice('/files'.length);
            return sub === '' || sub === '/' ? '/' : sub;
        }
        return '/';
    }

    async function uploadFileStateless(file: File, logicalPath: string, chunkSize = 8 * 1024 * 1024) {
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = Math.random().toString(36).slice(2);

        if (file.size === 0) {
            // Zero byte file handling
        }

        const safeChunks = totalChunks > 0 ? totalChunks : 1;

        for (let i = 0; i < safeChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            setStats(prev => ({ ...prev, progress: (i / safeChunks) * 100 }));

            await api.put(`/files/uploadchunked`, chunk, {
                headers: { "Content-Type": "application/octet-stream" },
                params: {
                    path: logicalPath,
                    file_id: fileId,
                    chunk_index: i,
                    chunk_size: chunkSize,
                    total_chunks: safeChunks,
                    total_size: file.size,
                },
                timeout: 120_000,
            });
        }
    }

    async function uploadFiles(files: File[], basePath?: string) {
        setStats({
            totalFiles: files.length,
            uploadedFiles: 0,
            currentFileName: '',
            progress: 0,
            uploading: true
        });

        const currentPath = getCurrentPath();
        const targetDir = basePath || (currentPath === "/" ? "/" : (currentPath.endsWith('/') ? currentPath : currentPath + '/'));

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStats(prev => ({ ...prev, currentFileName: file.name, uploadedFiles: i, progress: 0 }));

                const relativePath = file.webkitRelativePath || file.name;
                const fullPath = targetDir === "/" ? `/${relativePath}` : `${targetDir}${relativePath}`;

                await uploadFileStateless(file, fullPath);
            }
            useNotificationStore.getState().addNotification(`Successfully uploaded ${files.length} items`, "success");
        } catch (error: any) {
            console.error("Upload failed", error);
            let errorMessage = `Upload failed for ${stats.currentFileName}`;

            if (error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (typeof error.response.data === 'object') {
                    errorMessage = error.response.data.message || error.response.data.error || JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            useNotificationStore.getState().addNotification(errorMessage, "error");
        } finally {
            setStats(prev => ({ ...prev, uploading: false, progress: 100 }));
            triggerRefresh();
        }
    }

    return {
        uploadFiles,
        stats
    };
}
