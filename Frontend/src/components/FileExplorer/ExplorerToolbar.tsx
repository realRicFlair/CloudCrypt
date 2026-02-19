import { ArrowUp, FolderPlus, HomeIcon, RefreshCcw, Download, Copy, Trash2, ClipboardPaste } from "lucide-react";
import { IconButton, Panel } from "../ui";

interface ExplorerToolbarProps {
    currentPath: string;
    selectedCount: number;
    hasClipboard: boolean;
    onNavigateHome: () => void;
    onRefresh: () => void;
    onCreateFolder: () => void;
    onNavigateUp: () => void;
    onDownload: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onPaste: () => void;
}

export function ExplorerToolbar({
    currentPath,
    selectedCount,
    hasClipboard,
    onNavigateHome,
    onRefresh,
    onCreateFolder,
    onNavigateUp,
    onDownload,
    onCopy,
    onDelete,
    onPaste
}: ExplorerToolbarProps) {
    return (
        <Panel variant="bordered" padding="sm" className="flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
                <IconButton label="Go to root" onClick={onNavigateHome}>
                    <HomeIcon size={18} />
                </IconButton>
                <IconButton label="Go up" onClick={onNavigateUp}>
                    <ArrowUp size={18} />
                </IconButton>
            </div>

            {/* Filepath display */}
            <div className="flex-1 flex px-4 overflow-hidden">
                <div className="font-mono text-sm px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded shadow-inner whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-[var(--accent-primary)] font-medium">
                    <code>{currentPath}</code>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                    <>
                        <IconButton label={`Download (${selectedCount})`} onClick={onDownload}>
                            <Download size={18} />
                        </IconButton>
                        {/* Copy disabled for now untill copy stuff is fixed
                        <IconButton label="Copy" onClick={onCopy}>
                            <Copy size={18} />
                        </IconButton>
                        */}
                        <IconButton label="Delete" onClick={onDelete} className="text-red-500 hover:bg-red-500/10 hover:text-red-600">
                            <Trash2 size={18} />
                        </IconButton>
                    </>
                )}
                {hasClipboard && (
                    <IconButton label="Paste" onClick={onPaste}>
                        <ClipboardPaste size={18} />
                    </IconButton>
                )}

                <div className="w-[1px] h-6 bg-[var(--border-subtle)] mx-1" />

                <IconButton label="Refresh" onClick={onRefresh}>
                    <RefreshCcw size={18} />
                </IconButton>
                <IconButton label="New Folder" onClick={onCreateFolder}>
                    <FolderPlus size={18} />
                </IconButton>
            </div>
        </Panel>
    );
}
