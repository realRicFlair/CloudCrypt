import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type IconButtonSize = 'sm' | 'md' | 'lg';
type IconButtonVariant = 'default' | 'ghost' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    size?: IconButtonSize;
    variant?: IconButtonVariant;
    label: string;
}

const sizeStyles: Record<IconButtonSize, string> = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
};

export default function IconButton({
    children,
    size = 'md',
    variant = 'default',
    label,
    className,
    disabled,
    ...props
}: IconButtonProps) {
    return (
        <button
            disabled={disabled}
            aria-label={label}
            title={label}
            className={cn(
                "inline-flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors duration-200",
                "disabled:cursor-not-allowed disabled:opacity-50",
                variant === 'danger'
                    ? "text-[var(--accent-danger)] hover:bg-[var(--bg-hover)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                sizeStyles[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

