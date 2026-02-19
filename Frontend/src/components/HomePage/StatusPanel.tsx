import { Panel, ProgressBar } from "../ui";
import { cn } from "../../lib/utils";
import React from "react";

interface StatusPanelProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    subtitle: string;
    percentage?: number;
    status?: 'success' | 'warning' | 'danger';
}

export function StatusPanel({
    icon,
    title,
    value,
    subtitle,
    percentage,
    status
}: StatusPanelProps) {
    const statusTextColors: Record<string, string> = {
        success: 'text-[var(--accent-success)]',
        warning: 'text-[var(--accent-warning)]',
        danger: 'text-[var(--accent-danger)]',
    };

    return (
        <Panel variant="bordered" padding="md">
            <div className="flex items-center gap-2 mb-3 text-[var(--text-muted)]">
                {icon}
                <span className="text-xs font-medium">{title}</span>
            </div>

            <div className={cn(
                "text-xl font-semibold font-mono",
                status ? statusTextColors[status] : "text-[var(--text-primary)]"
            )}>
                {value}
            </div>

            <div className="text-xs text-[var(--text-muted)] mt-1">
                {subtitle}
            </div>

            {percentage !== undefined && (
                <div className="mt-3">
                    <ProgressBar value={percentage} size="sm" />
                </div>
            )}
        </Panel>
    );
}
