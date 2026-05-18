import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  PlusCircle, 
  Database, 
  BarChart3,
  LogIn,
  Menu,
  X,
  FileText,
  Building2,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Displaying profile company name or fallback
  const displayCompanyName = profile?.company_name || 'Escrow Ledger';

  const navItems = [
    { 
      name: 'Configure', 
      icon: <Settings className="w-4 h-4" />,
      subItems: [
        { name: 'Company Settings', icon: <Building2 className="w-4 h-4" />, path: '/configure/company' }
      ]
    },
    { 
      name: 'Create', 
      icon: <PlusCircle className="w-4 h-4" />,
      subItems: [
        { name: 'Create New Party', icon: <PlusCircle className="w-4 h-4" />, path: '/create/party' }
      ]
    },
    { 
      name: 'Data Entry', 
      icon: <Database className="w-4 h-4" />,
      subItems: [
        { name: 'Party A/C Ledger', icon: <Database className="w-4 h-4" />, path: '/ledger' }
      ]
    },
    { 
      name: 'Reports', 
      icon: <BarChart3 className="w-4 h-4" />,
      subItems: [
        { name: 'Party Report', icon: <FileText className="w-4 h-4" />, path: '/reports/parties' },
        { name: 'Balance Sheet', icon: <FileText className="w-4 h-4" />, path: '/reports/balance' }
      ]
    },
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 w-full transition-colors duration-200" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo - Uses Dynamic Company Name */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">
              {displayCompanyName}
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <div key={item.name} className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeDropdown === item.name 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  {item.icon}
                  {item.name}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === item.name && (
                  <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.path}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {sub.icon}
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 pr-3 rounded-full transition-all border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" />
                    ) : (
                      user.email?.[0].toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:block text-slate-700 dark:text-slate-300">
                    {profile?.full_name || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 overflow-hidden">
                    <Link 
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <hr className="border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={() => {
                        signOut();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-200 dark:shadow-none"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}

            <button 
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-lg overflow-y-auto max-h-[80vh] transition-colors duration-200">
          {navItems.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center gap-2 px-4 py-2 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">
                {item.icon}
                {item.name}
              </div>
              {item.subItems.map((sub) => (
                <Link
                  key={sub.name}
                  to={sub.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-8 py-3 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl font-medium transition-colors"
                >
                  {sub.icon}
                  {sub.name}
                </Link>
              ))}
            </div>
          ))}
          {/* Mobile Profile Link */}
          {user && (
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-8 py-4 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl font-bold transition-colors"
            >
              <User className="w-5 h-5" />
              Manage Profile
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
