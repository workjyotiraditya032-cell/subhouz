import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LayoutDashboard, Home, DoorOpen, Users, Image, CreditCard, Zap, Settings, LogOut, Bell, Search, ChevronDown, Menu, X, MessageCircle, Bolt, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import api from '../lib/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/hostels', label: 'Properties', icon: Home, superAdminOnly: true },
  { path: '/dashboard/rooms', label: 'Rooms & Beds', icon: DoorOpen },
  { path: '/dashboard/residents', label: 'Residents', icon: Users },
  { path: '/dashboard/rent-tracker', label: 'Rent Tracker', icon: CreditCard },
  { path: '/dashboard/enquiries', label: 'Enquiries', icon: MessageCircle },
  { path: '/dashboard/electricity', label: 'Electricity', icon: Bolt },
  { path: '/dashboard/automation', label: 'Automation', icon: Zap },
  { path: '/dashboard/admin-management', label: 'Admin Users', icon: ShieldCheck, superAdminOnly: true },
  {
    path: "/dashboard/website-images",
    label: "Website Images",
    icon: Image,
    superAdminOnly: true,
  },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      api.get('/hostels').then(res => {
        setHostels(res.data);
        const stored = localStorage.getItem('selectedHostelId');
        if (stored) {
          const found = res.data.find(h => h.id === stored);
          if (found) setSelectedHostel(found);
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleHostelSelect = (hostel) => {
    if (hostel) {
      setSelectedHostel(hostel);
      localStorage.setItem('selectedHostelId', hostel.id);
    } else {
      setSelectedHostel(null);
      localStorage.removeItem('selectedHostelId');
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (err) {
      toast.info("Logged out of local session");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    }
  };

  const filteredNav = navItems.filter(item => {
    if (item.superAdminOnly && user?.role !== 'super_admin') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 lg:static z-50 h-full lg:h-auto w-72 max-w-[82vw] bg-white lg:bg-transparent shadow-2xl lg:shadow-none transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} dashboard-sidebar flex flex-col`}>
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#10B981]" />
            <span className="font-bold text-lg tracking-tight text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hostel switcher for Super Admin */}
        {user?.role === 'super_admin' && hostels.length > 0 && (
          <div className="p-3 border-b border-[#E2E8F0]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="hostel-switcher"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-sm font-medium text-[#0F172A] transition-colors"
                >
                  <span className="truncate">{selectedHostel ? selectedHostel.name : 'All Properties'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => handleHostelSelect(null)} data-testid="hostel-option-all">
                  All Properties (Overview)
                </DropdownMenuItem>
                {hostels.map(h => (
                  <DropdownMenuItem key={h.id} onClick={() => handleHostelSelect(h)} data-testid={`hostel-option-${h.id}`}>
                    {h.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9] text-slate-700" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="mobile-menu-btn" aria-label="Toggle menu">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-1.5 lg:hidden">
              <Building2 className="w-5 h-5 text-[#10B981]" />
              <span className="font-bold text-base tracking-tight text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-[#F1F5F9] rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                data-testid="global-search"
                type="text"
                placeholder="Search residents, rooms..."
                className="bg-transparent text-sm border-none outline-none w-48 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="p-2 rounded-lg hover:bg-[#F1F5F9] relative" data-testid="notifications-btn">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Profile & Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="header-user-menu-btn"
                  className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E2E8F0] hover:opacity-80 transition-opacity focus:outline-none"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-sm font-semibold text-[#1D4ED8]">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-[#0F172A] leading-none">{user?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{user?.role === 'super_admin' ? 'Super Admin' : 'Property Admin'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1">
                <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-medium text-[#0F172A]">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.role === 'super_admin' ? 'Super Admin' : 'Property Admin'}</p>
                </div>
                <DropdownMenuItem
                  data-testid="header-logout-menu"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Header Logout Button */}
            <Button
              variant="outline"
              size="sm"
              data-testid="header-logout-btn"
              onClick={() => setShowLogoutModal(true)}
              className="hidden sm:flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-medium px-3 py-1.5 h-9 rounded-lg"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span>Logout</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden overflow-y-auto max-w-full">
          <Outlet context={{ selectedHostel, hostels }} />
        </main>
      </div>

      {/* Mobile Admin Bottom Navigation Bar */}
      <nav aria-label="Admin mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
            { path: '/dashboard/rooms', label: 'Rooms', icon: DoorOpen },
            { path: '/dashboard/residents', label: 'Residents', icon: Users },
            { path: '/dashboard/rent-tracker', label: 'Rent', icon: CreditCard },
          ].map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => { navigate(tab.path); setSidebarOpen(false); }}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px] ${
                  isActive ? 'text-[#1D4ED8] font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-[#1D4ED8]' : 'text-slate-500'}`} />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px] ${
              sidebarOpen ? 'text-[#10B981] font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent data-testid="logout-dialog" className="max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-slate-100">
          <AlertDialogHeader>
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-1">
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              disabled={isLoggingOut}
              data-testid="logout-cancel-btn"
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border-none"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              data-testid="logout-confirm-btn"
              disabled={isLoggingOut}
              onClick={handleConfirmLogout}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm"
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging out...</span>
                </div>
              ) : (
                <span>Logout</span>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
