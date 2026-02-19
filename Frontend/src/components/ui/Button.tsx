import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--accent-primary)] text-[var(--text-on-color)] border-transparent hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--accent-primary)]/50',
    secondary: 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] hover:bg-[var(--bg-hover)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)]',
    danger: 'bg-[var(--accent-danger)] text-[var(--text-on-color)] border-transparent hover:bg-[var(--accent-danger-hover)]',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2.5 text-sm h-10',
    lg: 'px-6 py-3.5 text-base h-12',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    iconPosition = 'left',
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 font-medium tracking-wide cursor-pointer transition-colors duration-200',
                'disabled:cursor-not-allowed disabled:opacity-50',
                fullWidth ? 'w-full' : 'w-auto',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    {children}
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </button>
    );
}

function LoadingSpinner() {
    return (
        <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
}
