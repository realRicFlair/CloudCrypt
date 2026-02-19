import FileCard from "../FileCard";
import type { FileItem } from "../../types/filetype";

interface FileGridProps {
    fileList: FileItem[];
    currentPath: string;
    selectedIds: Set<string>;
    onToggleStar: (id: string) => void;
    onFileClick: (file: FileItem, ctrlKey: boolean) => void;
    onFileDoubleClick: (file: FileItem) => void;
    onDelete: (file: FileItem) => void;
    onRename: (file: FileItem) => void;
    onShare: (file: FileItem) => void;
}

export function FileGrid({
    fileList,
    currentPath,
    selectedIds,
    onToggleStar,
    onFileClick,
    onFileDoubleClick,
    onDelete,
    onRename,
    onShare
}: FileGridProps) {
    if (fileList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                <p>No files in this directory</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 pb-6 overflow-y-auto"
            onClick={() => onFileClick({} as FileItem, false)} // Clear selection when clicking empty space
        >
            {fileList.map(file => (
                <div key={file.id} onClick={(e) => e.stopPropagation()}>
                    <FileCard
                        file={file}
                        isSelected={selectedIds.has(file.id)}
                        onToggleStar={onToggleStar}
                        onFileClick={onFileClick}
                        onDoubleClick={onFileDoubleClick}
                        onDelete={onDelete}
                        onRename={onRename}
                        onShare={onShare}
                        filePath={currentPath === "/" ? file.name : currentPath + "/" + file.name}
                    />
                </div>
            ))}
        </div>
    );
}
