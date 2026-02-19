import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface MenuContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    close: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function Menu({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const close = () => setIsOpen(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                close();
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <MenuContext.Provider value={{ isOpen, setIsOpen, close }}>
            <div ref={menuRef} className="relative inline-block text-left">
                {children}
            </div>
        </MenuContext.Provider>
    );
}

export function MenuTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
    const context = useContext(MenuContext);
    if (!context) throw new Error("MenuTrigger must be used within a Menu");

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                context.setIsOpen(!context.isOpen);
            }}
            className={cn("cursor-pointer", className)}
        >
            {children}
        </div>
    );
}

export function MenuContent({ children, className, align = "left" }: { children: React.ReactNode; className?: string; align?: "left" | "right" }) {
    const context = useContext(MenuContext);
    if (!context) throw new Error("MenuContent must be used within a Menu");

    if (!context.isOpen) return null;

    return (
        <div
            className={cn(
                "absolute z-50 mt-2 min-w-[160px] rounded-md border border-[var(--border-subtle)] bg-slate-700/80 shadow-lg focus:outline-none animate-in fade-in zoom-in-95 duration-100",
                align === "right" ? "right-0" : "left-0",
                className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it immediately (unless item clicked)
        >
            <div className="py-1">{children}</div>
        </div>
    );
}

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
    variant?: "default" | "danger";
}

export function MenuItem({ children, className, icon, variant = "default", onClick, ...props }: MenuItemProps) {
    const context = useContext(MenuContext);
    if (!context) throw new Error("MenuItem must be used within a Menu");

    return (
        <button
            onClick={(e) => {
                e.stopPropagation(); // Stop propagation to prevent parent clicks
                if (onClick) onClick(e);
                context.close();
            }}
            className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-xs text-left transition-colors duration-150",
                variant === "danger"
                    ? "text-[var(--accent-error)] hover:bg-[var(--bg-hover)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                className
            )}
            {...props}
        >
            {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
            {children}
        </button>
    );
}
