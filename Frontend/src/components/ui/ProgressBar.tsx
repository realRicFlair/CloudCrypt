import { cn } from '../../lib/utils';

interface ProgressBarProps {
    value: number; // 0-100
    size?: 'sm' | 'md';
    variant?: 'default' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    className?: string;
}

const variantColors: Record<string, string> = {
    default: 'bg-[var(--accent-primary)]',
    success: 'bg-[var(--accent-success)]',
    warning: 'bg-[var(--accent-warning)]',
    danger: 'bg-[var(--accent-danger)]',
};

export default function ProgressBar({
    value,
    size = 'md',
    variant = 'default',
    showLabel = false,
    className,
}: ProgressBarProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "w-full bg-[var(--bg-hover)] overflow-hidden",
                    size === 'sm' ? 'h-1' : 'h-2'
                )}
            >
                <div
                    className={cn(
                        "h-full transition-[width] duration-300",
                        variantColors[variant]
                    )}
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
            {showLabel && (
                <div className="flex justify-end mt-1 text-xs text-[var(--text-muted)] font-mono">
                    {clampedValue.toFixed(0)}%
                </div>
            )}
        </div>
    );
}
