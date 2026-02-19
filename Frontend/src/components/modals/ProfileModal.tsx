import { useState, useRef } from "react";
import { X, User, Mail, Lock, Camera } from "lucide-react";
import { Button, IconButton, Panel } from "../ui";
import { updateProfile, uploadAvatar } from "../../api";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../Notifications/notificationStore";

interface ProfileModalProps {
    onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
    const { user } = useAuthStore(); // We might need a refreshUser function in context
    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // We should ideally restart the app or refresh context to reflect changes, especially avatar
    // For now, let's force a window reload on avatar success or profile update success if impactful

    const handleUpdate = async () => {
        setLoading(true);
        try {
            if (!currentPassword) {
                useNotificationStore.getState().addNotification("Current password required", "error");
                setLoading(false);
                return;
            }

            await updateProfile({
                username: username !== user?.username ? username : undefined,
                email: email !== user?.email ? email : undefined,
                current_password: currentPassword,
                new_password: newPassword || undefined
            });

            useNotificationStore.getState().addNotification("Profile updated!", "success");
            // Clear sensitive fields
            setCurrentPassword("");
            setNewPassword("");
            // Ideally trigger a user refresh here
        } catch (err: any) {
            useNotificationStore.getState().addNotification(err.response?.data?.error || "Update failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLoading(true);
            try {
                await uploadAvatar(e.target.files[0]);
                // Update local user object if possible, or reload
                // user.profile_pic = res.data.profile_pic; // This won't work without setUser
                useNotificationStore.getState().addNotification("Avatar updated!", "success");
                window.location.reload(); // Simple brute force update for now
            } catch (err: any) {
                useNotificationStore.getState().addNotification("Avatar upload failed", "error");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Panel variant="elevated" padding="none" className="w-[90vw] max-w-[500px] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0">Profile Settings</h2>
                    <IconButton onClick={onClose} label="Close">
                        <X size={20} />
                    </IconButton>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--bg-hover)] border-2 border-[var(--border-subtle)] group">
                            {user?.profile_pic ? (
                                <img src={user.profile_pic} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                    <User size={48} />
                                </div>
                            )}
                            <div
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />
                        <span className="text-xs text-[var(--accent-primary)] font-medium mt-2 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>Change Profile Picture</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                                <User size={16} /> Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                                <Mail size={16} /> Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                            />
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-4" />

                        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Change Password</h3>

                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                                <Lock size={16} /> New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                            />
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-4" />

                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                                <Lock size={16} /> Current Password <span className="text-[var(--accent-danger)]">*</span>
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                                required
                            />
                        </div>
                    </div>


                </div>

                <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex justify-end gap-3 rounded-b-lg">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Panel>
        </div>
    );
}
