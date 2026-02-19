import { HardDrive } from "lucide-react";
import { Panel, ProgressBar } from "../ui";
import { useUsageStore } from "../../stores/usageStore";
import { useEffect } from "react";


export function StorageIndicator() {
    const { totalBytes, fetchUsage } = useUsageStore();
    const STORAGE_LIMIT = 50 * 1024 * 1024 * 1024; // 50 GB

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    const usedGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const percentage = Math.min((totalBytes / STORAGE_LIMIT) * 100, 100);

    return (
        <Panel variant="bordered" padding="sm" className="mt-auto">
            <div className="flex items-center gap-2 mb-2 text-[var(--text-secondary)]">
                <HardDrive size={14} />
                <span className="text-xs font-medium">Storage</span>
            </div>
            <div className="flex justify-between items-end mb-2 text-xs">
                <span className="text-[var(--text-muted)]">Used</span>
                <span className="text-[var(--text-primary)] font-mono">{usedGB} GB / 50 GB</span>
            </div>
            <ProgressBar value={percentage} size="sm" />
        </Panel>
    );
}
