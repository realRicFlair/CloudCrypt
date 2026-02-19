import LoginPanel from "./LoginPanel";

interface LoginPageProps {
    isRegistering?: boolean;
}

export default function LoginPage({ isRegistering = false }: LoginPageProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
            <LoginPanel
                isRegistering={isRegistering}
            />
        </div>
    );
}
