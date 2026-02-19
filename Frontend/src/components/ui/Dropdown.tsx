import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right';
}

interface DropdownItemProps {
    children: ReactNode;
    onClick?: () => void;
    icon?: ReactNode;
    danger?: boolean;
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={cn(
                        "absolute top-[calc(100%+4px)] min-w-[160px] py-1 z-50",
                        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg",
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                    onClick={() => setIsOpen(false)}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export function DropdownItem({ children, onClick, icon, danger = false }: DropdownItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 w-full px-4 py-2.5 text-sm font-sans text-left border-none cursor-pointer transition-colors duration-200",
                "bg-transparent hover:bg-[var(--bg-hover)]",
                danger ? "text-[var(--accent-danger)]" : "text-[var(--text-primary)]"
            )}
        >
            {icon && (
                <span className={cn(
                    "flex items-center justify-center w-4 h-4",
                    danger ? "text-[var(--accent-danger)]" : "text-[var(--text-muted)]"
                )}>
                    {icon}
                </span>
            )}
            {children}
        </button>
    );
}

export function DropdownDivider() {
    return (
        <div className="h-px bg-[var(--border-subtle)] my-1" />
    );
}
