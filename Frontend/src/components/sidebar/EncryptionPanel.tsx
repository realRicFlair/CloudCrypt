import { Cloud, Lock, Shield, Unlock } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { Button, Panel } from "../ui";

export function EncryptionPanel() {
    const { encryptionKey, setEncryptionKey, user } = useAuthStore();
    const [keyInput, setKeyInput] = useState("");

    const handleUnlock = () => {
        if (keyInput.length > 0) {
            setEncryptionKey(keyInput);
            setKeyInput("");
        }
    };

    const handleLock = () => {
        setEncryptionKey(null);
    };

    return (
        <Panel variant="bordered" padding="sm" className="mt-8">
            <div className="flex items-center gap-2 mb-3">
                {encryptionKey ? (
                    <Unlock size={14} className="text-[var(--accent-success)]" />
                ) : (
                    <Lock size={14} className="text-[var(--text-muted)]" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {encryptionKey ? "Unlocked" : "Locked"}
                </span>
            </div>

            {/* Key Management Status */}
            <div className="flex items-center gap-2 mb-3 bg-[var(--bg-subtle)] p-2 rounded border border-[var(--border-subtle)]">
                {user?.key_stored ? (
                    <Cloud size={14} className="text-[var(--accent-info)]" />
                ) : (
                    <Shield size={14} className="text-[var(--accent-warning)]" />
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-none mb-0.5">
                        Key Mode
                    </span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {user?.key_stored ? "Server Managed" : "User Managed"}
                    </span>
                </div>
            </div>

            {encryptionKey ? (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLock}
                    fullWidth
                    className="mt-2 text-xs"
                >
                    Lock / Clear Key
                </Button>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        type="password"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="Encryption key..."
                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                    />
                    <button
                        onClick={handleUnlock}
                        disabled={!keyInput}
                        className="bg-[var(--accent-primary)] text-white p-1.5 rounded border-none cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-primary-hover)] transition-colors"
                    >
                        <Unlock size={12} />
                    </button>
                </div>
            )}
        </Panel>
    );
}
