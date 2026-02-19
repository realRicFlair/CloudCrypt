import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

export default function Input({
    label,
    error,
    fullWidth = true,
    id,
    className,
    ...props
}: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={cn(fullWidth ? 'w-full' : 'w-auto')}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block mb-2 text-sm font-medium text-[var(--text-secondary)]"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={cn(
                    'w-full px-4 py-3 font-sans text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]',
                    'border border-[var(--border-subtle)] outline-none transition-colors duration-200',
                    'focus:border-[var(--accent-primary)]',
                    error && 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)]',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-[var(--accent-danger)]">
                    {error}
                </p>
            )}
        </div>
    );
}
