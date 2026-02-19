import { cn } from "../../lib/utils";
import React from "react";

interface QuickActionProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

export function QuickAction({
    icon,
    title,
    description,
    onClick
}: QuickActionProps) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] cursor-pointer transition-colors duration-200",
                "hover:bg-[var(--bg-hover)]"
            )}
            onClick={onClick}
        >
            <div className="flex items-center justify-center p-2 rounded bg-[var(--bg-primary)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
                {icon}
            </div>
            <div className="flex flex-col gap-1">
                <h3 className="m-0 text-sm font-medium text-[var(--text-primary)]">{title}</h3>
                <p className="m-0 text-xs text-[var(--text-muted)]">{description}</p>
            </div>
        </div>
    );
}
