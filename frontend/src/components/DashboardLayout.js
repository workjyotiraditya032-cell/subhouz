import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LayoutDashboard, Home, DoorOpen, Users, CreditCard, Zap, Settings, LogOut, Bell, Search, ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import api from '../lib/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/hostels', label: 'Hostels', icon: Home, superAdminOnly: true },
  { path: '/dashboard/rooms', label: 'Rooms & Beds', icon: DoorOpen },
  { path: '/dashboard/residents', label: 'Residents', icon: Users },
  { path: '/dashboard/rent-tracker', label: 'Rent Tracker', icon: CreditCard },
  { path: '/dashboard/automation', label: 'Automation', icon: Zap },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => {
    if (item.superAdminOnly && user?.role !== 'super_admin') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full lg:h-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} dashboard-sidebar flex flex-col`}>
        <div className="p-5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#10B981]" />
            <span className="font-bold text-lg tracking-tight text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
          </div>
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
                  <span className="truncate">{selectedHostel ? selectedHostel.name : 'All Hostels'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => handleHostelSelect(null)} data-testid="hostel-option-all">
                  All Hostels (Overview)
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

        <div className="p-3 border-t border-[#E2E8F0]">
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="sidebar-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9]" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="mobile-menu-btn">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-[#F1F5F9] relative" data-testid="notifications-btn">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-sm font-semibold text-[#1D4ED8]">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-[#0F172A] leading-none">{user?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.role === 'super_admin' ? 'Super Admin' : 'Hostel Admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet context={{ selectedHostel, hostels }} />
        </main>
      </div>
    </div>
  );
}
