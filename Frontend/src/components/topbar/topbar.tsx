import { Settings, UserCircle2, CloudIcon, LogOut, User } from "lucide-react";
import { IconButton, Dropdown, DropdownItem, DropdownDivider } from "../ui";
import { useAuthStore } from "../../stores/authStore";
import { useSearchParams, useNavigate } from "react-router";
import ProfileModal from "../modals/ProfileModal";
import SettingsModal from "../modals/SettingsModal";

function TopBar() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeModal = searchParams.get('modal');

  const openModal = (modal: string) => {
    setSearchParams(prev => {
      prev.set('modal', modal);
      return prev;
    });
  };

  const closeModal = () => {
    setSearchParams(prev => {
      prev.delete('modal');
      return prev;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <nav className="h-full bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-6 sticky top-0 z-40">
        <a href="/" className="flex items-center gap-3 no-underline text-[var(--text-primary)] group" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <CloudIcon className="w-6 h-6 text-[var(--accent-primary)] transition-transform duration-300 group-hover:scale-110" aria-hidden />
          <span className="font-sans font-bold text-lg tracking-tight">CloudCrypt</span>
        </a>

        <div className="flex items-center gap-2">
          <IconButton label="Settings" onClick={() => openModal('settings')}>
            <Settings size={20} />
          </IconButton>

          <Dropdown
            trigger={
              <IconButton label="User menu">
                {user?.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={user.username}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle2 size={20} />
                )}
              </IconButton>
            }
          >
            <DropdownItem icon={<User size={16} />} onClick={() => openModal('profile')}>
              Profile
            </DropdownItem>
            <DropdownItem icon={<Settings size={16} />} onClick={() => openModal('settings')}>
              Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={<LogOut size={16} />} onClick={handleLogout} danger>
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </nav>

      {activeModal === 'profile' && <ProfileModal onClose={closeModal} />}
      {activeModal === 'settings' && <SettingsModal onClose={closeModal} />}
    </>
  );
}

export default TopBar;