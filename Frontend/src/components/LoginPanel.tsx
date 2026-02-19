import type React from "react";
import api from "../api";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Panel } from "./ui";

type Props = {
    isRegistering: boolean;
};

export default function LoginPanel({ isRegistering }: Props) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Registration Step from URL
    const step = searchParams.get('step') === 'setup' ? 2 : 1;
    const [storeKey, setStoreKey] = useState(true);
    const [customKey, setCustomKey] = useState("");

    const { login, setEncryptionKey } = useAuthStore();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (isRegistering && step === 1) {
            setSearchParams({ step: 'setup' });
            return;
        }

        setLoading(true);

        try {
            if (isRegistering) {
                await api.post("/auth/register", {
                    email: email,
                    username: username,
                    password: password,
                    encryption_key: customKey,
                    store_key: storeKey
                }, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (!storeKey) {
                    setEncryptionKey(customKey);
                }
            }

            const loginRes = await api.post("/auth/login", {
                email: email,
                password: password
            }, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            login(loginRes.data);
            navigate('/', { replace: true });
        } catch (err: any) {
            console.error(err);
            let errorMessage = "An error occurred. Please try again.";

            if (err.response) {
                if (err.response.status === 409) {
                    errorMessage = "User already exists. Please login.";
                } else if (err.response.data) {
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (typeof err.response.data === 'object' && err.response.data.message) {
                        errorMessage = err.response.data.message;
                    }
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const reset = () => {
        setSearchParams({});
        setError(null);
        setCustomKey("");
        setStoreKey(true);
    };

    const handleSwap = () => {
        reset();
        navigate(isRegistering ? '/login' : '/register', { replace: true });
    };

    const handleBack = () => {
        setSearchParams({});
    };

    return (
        <Panel
            variant="bordered"
            padding="lg"
            className="w-full max-w-[400px] mx-4"
        >
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="m-0 text-2xl font-semibold text-[var(--text-primary)]">
                    {isRegistering ? (step === 1 ? "Create Account" : "Security Setup") : "Welcome Back"}
                </h1>
                <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
                    {isRegistering
                        ? (step === 1 ? "Join CloudCrypt" : "Configure your encryption preferences")
                        : "Sign in to access your files"}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-[rgba(218,30,40,0.1)] border border-[var(--accent-danger)] text-[var(--accent-danger)] text-sm rounded">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                {isRegistering && step === 2 ? (
                    <div className="flex flex-col gap-4">
                        {/* Key Storage Option */}
                        <Panel variant="elevated" padding="md">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={storeKey}
                                    onChange={e => setStoreKey(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-[var(--accent-primary)]"
                                />
                                <div>
                                    <span className="block font-medium text-[var(--text-primary)] text-sm">
                                        Store key on server
                                    </span>
                                    <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                                        Server handles encryption. Recommended for most users.
                                    </span>
                                </div>
                            </label>
                        </Panel>

                        {/* Custom Key Input */}
                        {!storeKey && (
                            <div>
                                <Input
                                    label="Your Encryption Key"
                                    type="text"
                                    value={customKey}
                                    onChange={e => setCustomKey(e.target.value)}
                                    placeholder="Enter a strong secret key..."
                                    required={!storeKey}
                                    className="font-mono"
                                />
                                <p className="mt-2 text-xs text-[var(--accent-warning)]">
                                    Warning: If you lose this key, your files cannot be recovered.
                                </p>
                            </div>
                        )}

                        {/* Step 2 Buttons */}
                        <div className="flex gap-3 mt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="flex-none"
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                loading={loading}
                                fullWidth
                            >
                                {loading ? "Creating..." : "Finish"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {isRegistering && (
                            <Input
                                label="Username"
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Your name"
                                required
                            />
                        )}

                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@email.com"
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />

                        {!isRegistering && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-[var(--accent-primary)]"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">
                                    Remember me
                                </span>
                            </label>
                        )}

                        <Button
                            type="submit"
                            loading={loading}
                            fullWidth
                            className="mt-2"
                        >
                            {loading ? "Processing..." : (isRegistering ? "Continue" : "Sign In")}
                        </Button>
                    </div>
                )}
            </form>

            {/* Footer */}
            <div className="mt-5 text-center text-sm text-[var(--text-muted)]">
                {isRegistering ? "Already have an account?" : "Don't have an account?"}
                <button
                    type="button"
                    onClick={handleSwap}
                    className="ml-2 bg-transparent border-none text-[var(--accent-primary)] font-medium cursor-pointer hover:underline"
                >
                    {isRegistering ? "Sign in" : "Register"}
                </button>
            </div>
        </Panel>
    );
}