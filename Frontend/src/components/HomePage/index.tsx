import { Folder, Upload, Clock, HardDrive, Shield, Settings, Share2Icon, Users2Icon } from "lucide-react";
import { useNavigate } from "react-router";
import { QuickAction } from "./QuickAction";
import { StatusPanel } from "./StatusPanel";
import { useEffect, useState } from "react";
import api from "../../api";
import { useUsageStore } from "../../stores/usageStore";
import { useSearchParams } from "react-router";

export default function HomePage() {
    const navigate = useNavigate();
    const [serverOnline, setServerOnline] = useState(false);
    const { totalBytes, fileCount, fetchUsage } = useUsageStore();
    const STORAGE_LIMIT = 50 * 1024 * 1024 * 1024; // 50 GB

    const [searchParams, setSearchParams] = useSearchParams();

    const openModal = (modal: string) => {
        setSearchParams(prev => {
            prev.set('modal', modal);
            return prev;
        });
    };

    useEffect(() => {
        //console.log("Component loaded for the first time.");
        api.get('/health').then(response => {
            if (response.data.online == "OK") {
                setServerOnline(true);
            }
        });
        fetchUsage();
    }, [fetchUsage]);

    const usedGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const percentage = Math.min((totalBytes / STORAGE_LIMIT) * 100, 100);

    return (
        <div className="flex-1 p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold font-sans tracking-tight text-[var(--text-primary)] m-0">Dashboard</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)] m-0">Manage your files and storage</p>
            </div>

            {/* Quick Actions */}
            <section className="mb-6">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Quick Actions</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                    <QuickAction
                        icon={<Folder size={20} />}
                        title="Browse Files"
                        description="Access your files and folders"
                        onClick={() => navigate('/files')}
                    />
                    <QuickAction
                        icon={<Upload size={20} />}
                        title="Upload"
                        description="Add new files to your storage"
                        onClick={() => navigate('/files')}
                    />
                    <QuickAction
                        icon={<Users2Icon size={20} />}
                        title="Shared Files"
                        description="View shared files"
                        onClick={() => navigate('/shared')}
                    />
                    <QuickAction
                        icon={<Shield size={20} />}
                        title="Security"
                        description="Manage encryption settings"
                        onClick={() => openModal('settings')}
                    />
                </div>
            </section>

            {/* Status Panels */}
            <section>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">System Status</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                    <StatusPanel
                        icon={<HardDrive size={18} />}
                        title="Storage"
                        value={`${usedGB} GB`}
                        subtitle="of 50 GB used"
                        percentage={percentage}
                    />
                    <StatusPanel
                        icon={<Folder size={18} />}
                        title="Files"
                        value={fileCount.toString()}
                        subtitle="Total files stored"
                    />
                    <StatusPanel
                        icon={<Settings size={18} />}
                        title="Status"
                        value={serverOnline ? "Online" : "Offline"}
                        subtitle={serverOnline ? "Functional so far" : "Server Offline"}
                        status={serverOnline ? "success" : "danger"}
                    />
                </div>
            </section>
        </div>
    );
}
