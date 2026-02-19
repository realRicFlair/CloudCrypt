import { Folder, Home, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import UploadButton from "../UploadButton";
import { EncryptionPanel } from "./EncryptionPanel";
import { SidebarButton } from "./SidebarButton";
import { StorageIndicator } from "./StorageIndicator";

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active view from the current URL path
    const isHome = location.pathname === '/';
    const isFiles = location.pathname.startsWith('/files');

    return (
        <div className="h-full bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] p-4 flex flex-col overflow-y-auto">
            <UploadButton />

            <nav className="flex flex-col gap-1 mt-6">
                <SidebarButton
                    icon={<Home size={18} />}
                    active={isHome}
                    onClick={() => navigate('/')}
                >
                    Home
                </SidebarButton>
                <SidebarButton
                    icon={<Folder size={18} />}
                    active={isFiles}
                    onClick={() => navigate('/files')}
                >
                    All Files
                </SidebarButton>

                <SidebarButton
                    icon={<Users size={18} />}
                    active={location.pathname === '/shared'}
                    onClick={() => navigate('/shared')}
                >
                    Shared
                </SidebarButton>
            </nav>

            <EncryptionPanel />

            <StorageIndicator />
        </div>
    );
}
