import { CloudUpload, File, Folder } from 'lucide-react';
import { useRef } from 'react';
import { ProgressBar, Dropdown, DropdownItem } from './ui';
import { useFileUploader } from '../hooks/useFileUploader';
import { cn } from '../lib/utils';

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, stats } = useFileUploader();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(Array.from(event.target.files));
    }
    // Reset input
    if (event.target) event.target.value = '';
  };

  return (
    <div className="w-full">
      {stats.uploading ? (
        <div className={cn(
          "flex flex-col gap-1 p-2 w-full rounded-md cursor-default",
          "bg-[var(--accent-primary)] text-[var(--text-on-color)]"
        )}>
          <div className="flex justify-between text-xs font-medium opacity-90">
            <span className="truncate max-w-[70%]">{stats.currentFileName}</span>
            <span>{stats.uploadedFiles + 1}/{stats.totalFiles}</span>
          </div>
          <ProgressBar value={stats.progress} size="sm" className="bg-white/20" />
        </div>
      ) : (
        <Dropdown
          trigger={
            <div className={cn(
              "flex items-center justify-center gap-2 w-full p-3 rounded-md",
              "bg-[var(--accent-primary)] text-[var(--text-on-color)]",
              "font-sans text-sm font-medium cursor-pointer",
              "transition-colors duration-200 hover:bg-[var(--accent-primary-hover)]"
            )}>
              <CloudUpload size={18} />
              <span>Upload</span>
            </div>
          }
          align="right"
        >
          <DropdownItem onClick={() => fileInputRef.current?.click()} icon={<File size={16} />}>
            Upload Files
          </DropdownItem>
          <DropdownItem onClick={() => folderInputRef.current?.click()} icon={<Folder size={16} />}>
            Upload Folder
          </DropdownItem>
        </Dropdown>
      )}

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is standard in all modern browsers but missing in standard types sometimes
        webkitdirectory=""
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}