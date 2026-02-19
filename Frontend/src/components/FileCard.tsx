import { Folder, Star, Image, Film, Music, Archive, FileText, Code, File, MoreVertical, Trash2, Edit, Share2 } from "lucide-react";
import type { FileItem } from "../types/filetype";
import { useState, useEffect } from "react";
import api from "../api";
import { cn } from "../lib/utils";
import { Menu, MenuTrigger, MenuContent, MenuItem } from "./ui";

type FileCardProps = {
    file: FileItem;
    filePath: string;
    isSelected?: boolean;
    onToggleStar: (id: string) => void;
    onFileClick?: (file: FileItem, ctrlKey: boolean) => void;
    onDoubleClick?: (file: FileItem) => void;
    onDelete?: (file: FileItem) => void;
    onRename?: (file: FileItem) => void;
    onShare?: (file: FileItem) => void;
};

export default function FileCard({
    file,
    onToggleStar,
    onFileClick,
    onDoubleClick,
    onDelete,
    onRename,
    onShare,
    filePath,
    isSelected
}: FileCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        if (file.mimeType === 'image') {
            fetchImage();
        }
    }, [file, filePath]);

    const fetchImage = async () => {
        try {
            const response = await api.get('/files/download', {
                params: { filepath: filePath },
                responseType: 'blob'
            });

            if (response.data && response.data.size > 0) {
                const url = URL.createObjectURL(response.data);
                setImageUrl(url);
                setImageLoaded(true);
            }
        } catch (error) {
            console.error('Failed to load image:', error);
        }
    };

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    const getFileIcon = () => {
        const iconProps = { size: 40, strokeWidth: 1.5 };

        if (file.type === 'folder') {
            return <Folder {...iconProps} className="text-[var(--accent-primary)] fill-[var(--accent-primary)] fill-opacity-20" />;
        }

        const mimeType = file.mimeType || '';

        if (mimeType.includes('image')) {
            if (imageLoaded && imageUrl) {
                return (
                    <img
                        src={imageUrl}
                        alt={file.name}
                        className="w-full h-20 object-cover"
                        onError={() => {
                            setImageLoaded(false);
                            setImageUrl(null);
                        }}
                    />
                );
            }
            return <Image {...iconProps} className="text-[var(--accent-success)]" />;
        }

        if (mimeType.includes('video')) return <Film {...iconProps} className="text-[var(--accent-purple)]" />;
        if (mimeType.includes('audio')) return <Music {...iconProps} className="text-[var(--accent-pink)]" />;
        if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive {...iconProps} className="text-[var(--accent-warning)]" />;
        if (mimeType.includes('text') || mimeType.includes('document')) return <FileText {...iconProps} className="text-[var(--accent-primary)]" />;
        if (mimeType.includes('code') || mimeType.includes('json')) return <Code {...iconProps} className="text-[var(--accent-orange)]" />;

        return <File {...iconProps} className="text-[var(--text-muted)]" />;
    };

    return (
        <div
            onClick={(e) => onFileClick && onFileClick(file, e.ctrlKey || e.metaKey)}
            onDoubleClick={() => onDoubleClick && onDoubleClick(file)}
            className={cn(
                "group relative flex flex-col items-center gap-3 p-2",
                "border cursor-pointer transition-[background-color,transform,border-color] duration-200",
                isSelected
                    ? "bg-[var(--bg-active)] border-[var(--accent-primary)]"
                    : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:-translate-y-0.5"
            )}
        >
            {/* Share Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onShare?.(file);
                }}
                className={cn(
                    "absolute top-2 right-8 p-1 bg-transparent border-none cursor-pointer",
                    "transition-opacity duration-200",
                    "opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                )}
                title="Share"
            >
                <Share2 size={16} />
            </button>

            {/* Star Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(file.id);
                }}
                className={cn(
                    "absolute top-2 right-2 p-1 bg-transparent border-none cursor-pointer",
                    "transition-opacity duration-200",
                    file.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
            >
                <Star
                    size={16}
                    className={cn(
                        file.starred ? "fill-[var(--accent-warning)] stroke-[var(--accent-warning)]" : "stroke-[var(--text-muted)]"
                    )}
                />
            </button>

            {/* Menu Button */}
            <div className={cn(
                "absolute top-2 left-0 z-10",
                "transition-opacity duration-200",
                "opacity-0 group-hover:opacity-100"
            )}>
                <Menu>
                    <MenuTrigger className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <MoreVertical size={16} />
                    </MenuTrigger>
                    <MenuContent className="bg-[var(--bg-secondary)]">
                        <MenuItem
                            onClick={() => onShare?.(file)}
                            icon={<Share2 size={12} />}
                        >
                            Share
                        </MenuItem>
                        <MenuItem
                            onClick={() => onRename?.(file)}
                            icon={<Edit size={12} />}
                        >
                            Rename
                        </MenuItem>
                        <MenuItem
                            onClick={() => onDelete?.(file)}
                            variant="danger"
                            icon={<Trash2 size={12} />}
                        >
                            Delete
                        </MenuItem>
                    </MenuContent>
                </Menu>
            </div>

            {/* Icon */}
            <div className="flex items-center justify-center min-h-[80px] w-[80%]">
                {getFileIcon()}
            </div>

            {/* Name and Type */}
            <div className="w-full text-center">
                <p
                    className="m-0 text-sm font-medium text-[var(--text-primary)] truncate"
                    title={file.name}
                >
                    {file.name}
                </p>
                <p className="m-0 mt-1 text-xs text-[var(--text-muted)] capitalize">
                    {file.type}
                </p>
            </div>
        </div>
    );
}
