import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PanelVariant = 'default' | 'elevated' | 'bordered';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: PanelVariant;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
};

export default function Panel({
    children,
    variant = 'default',
    padding = 'md',
    className,
    ...props
}: PanelProps) {
    return (
        <div
            className={cn(
                paddingStyles[padding],
                variant === 'elevated' ? 'bg-[var(--bg-elevated)]' : 'bg-[var(--bg-secondary)]',
                'border border-[var(--border-subtle)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

