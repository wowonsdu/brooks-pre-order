import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { Button } from './ui/button';
import { 
  Package, 
  ShoppingCart, 
  ClipboardList, 
  LayoutDashboard, 
  Truck, 
  Users, 
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export function RootLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Customer Navigation
  const customerNavItems = [
    { path: '/catalog', label: 'Katalog', icon: Package },
    { path: '/cart', label: 'Koszyk', icon: ShoppingCart },
    { path: '/my-orders', label: 'Moje Zamówienia', icon: ClipboardList },
  ];

  // Admin Navigation
  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/preorders', label: 'Preordery', icon: ClipboardList },
    { path: '/admin/consolidation', label: 'Konsolidacja', icon: FileText },
    { path: '/admin/deliveries', label: 'Dostawy', icon: Truck },
    { path: '/admin/customers', label: 'Klienci', icon: Users },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : customerNavItems;

  // Don't show layout on login page
  if (location.pathname === '/login' || location.pathname === '/') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to={user?.role === 'admin' ? '/admin' : '/catalog'} className="text-xl font-bold text-gray-900">
                B2B PreOrder System
              </Link>
              
              <nav className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                    {user.companyName && (
                      <span className="text-xs text-gray-500">{user.companyName}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden md:flex gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj
                  </Button>
                  
                  {/* Mobile menu button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              {user && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.companyName && (
                      <div className="text-xs text-gray-500">{user.companyName}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start gap-2 mt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}