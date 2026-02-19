import { cn } from "../../lib/utils";
import React from "react";

interface SidebarButtonProps {
    icon: React.ReactNode;
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}

export function SidebarButton({
    icon,
    children,
    active = false,
    onClick
}: SidebarButtonProps) {
    return (
        <button
            className={cn(
                "flex items-center gap-3 w-full px-3 py-2 border-none rounded bg-transparent cursor-pointer transition-colors duration-200 text-sm font-medium",
                active
                    ? "bg-[var(--bg-elevated)] text-[var(--accent-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
            onClick={onClick}
        >
            <span className={cn(
                "flex items-center justify-center opacity-80",
                active && "opacity-100"
            )}>{icon}</span>
            <span className="tracking-tight">{children}</span>
        </button>
    );
}
