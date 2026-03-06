import React, { useState, useEffect } from 'react';
import { initDb } from './db';
import { UserRole, Language, User, NavItem } from './types';
import { Header } from './components/Header';
import { Dashboard } from './views/Dashboard';
import { LessonPlanner } from './views/LessonPlanner';
import { UserManagement } from './views/Students';
import { Curriculum } from './views/Curriculum';
import { Gradebook } from './views/Gradebook';
import { ClassManagement } from './views/ClassManagement';
import { Analytics } from './views/Analytics';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  LibraryBig,
  BarChart3,
  Settings,
  School,
  Activity,
  Menu,
  X,
  FileSpreadsheet,
  Users
} from 'lucide-react';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setDbReady(true));
  }, []);

  // Mock User State
  const [user, setUser] = useState<User>({
    id: 'u1',
    name: 'Sarah Al-Majed',
    role: UserRole.TEACHER,
    avatar: 'https://i.pravatar.cc/150?u=sarah'
  });

  const toggleLanguage = () => {
    setLanguage(prev => prev === Language.AR ? Language.EN : Language.AR);
  };

  const toggleRole = () => {
    setUser(prev => ({
      ...prev,
      role: prev.role === UserRole.TEACHER ? UserRole.ADMIN : (prev.role === UserRole.ADMIN ? UserRole.STUDENT : UserRole.TEACHER)
    }));
  };

  const isRTL = language === Language.AR;

  // Navigation Config
  const navItems: NavItem[] = [
    { id: 'dashboard', labelEn: 'Dashboard', labelAr: 'الرئيسية', icon: <LayoutDashboard size={20} />, view: 'dashboard' },
    { id: 'classes', labelEn: 'Classes', labelAr: 'الفصول', icon: <School size={20} />, view: 'classes' },
    { id: 'gradebook', labelEn: 'Gradebook', labelAr: 'سجل الدرجات', icon: <FileSpreadsheet size={20} />, view: 'gradebook' },
    { id: 'lessons', labelEn: 'Lesson Planner', labelAr: 'تخطيط الدروس', icon: <BookOpen size={20} />, view: 'lessons' },
    { id: 'users', labelEn: 'Users', labelAr: 'المستخدمين', icon: <Users size={20} />, view: 'users' },
    { id: 'curriculum', labelEn: 'Curriculum', labelAr: 'المنهج الدراسي', icon: <LibraryBig size={20} />, view: 'curriculum' },
    { id: 'analytics', labelEn: 'Analytics', labelAr: 'التحليلات', icon: <BarChart3 size={20} />, view: 'analytics' },
    { id: 'settings', labelEn: 'Settings', labelAr: 'الإعدادات', icon: <Settings size={20} />, view: 'settings' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard role={user.role} language={language} />;
      case 'classes':
        return <ClassManagement role={user.role} language={language} user={user} />;
      case 'lessons':
        return <LessonPlanner language={language} />;
      case 'users':
        return <UserManagement language={language} role={user.role} />;
      case 'curriculum':
        return <Curriculum language={language} />;
      case 'gradebook':
        return <Gradebook role={user.role} language={language} />;
      case 'analytics':
        return <Analytics role={user.role} language={language} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-6xl mb-6 opacity-30">
              <Settings size={64} />
            </span>
            <p className="text-xl font-medium">Feature coming soon</p>
          </div>
        );
    }
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-6"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Initializing System</h1>
        <p className="text-gray-500 max-w-sm">Setting up your secure local database. This only takes a moment...</p>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#fdfdfd] flex text-gray-900 font-sans relative">

      {/* Mobile Menu Toggle */}
      <div className={`lg:hidden fixed top-0 ${isRTL ? 'right-0' : 'left-0'} z-50 p-4`}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* M3 Navigation Drawer */}
      <aside className={`
        w-[280px] bg-[#f8f9fa] flex-shrink-0 flex flex-col fixed h-full z-40 transition-transform duration-300 border-r border-gray-100
        ${isRTL ? 'right-0 border-l border-r-0' : 'left-0 border-r'}
        ${isMobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        lg:translate-x-0
      `}>
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
              <School size={24} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Faheem</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.view);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-full text-sm font-bold transition-all duration-200 ${isActive
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                {item.icon}
                <span>{isRTL ? item.labelAr : item.labelEn}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-6">
          <div className="bg-primary-50 rounded-3xl p-5 border border-primary-100">
            <div className="flex items-center gap-2 text-primary-700 mb-2">
              <Activity size={16} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">System Live</span>
            </div>
            <p className="text-xs text-primary-600 font-medium">v2.4.0 • Gemini 3.0 Integrated</p>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all w-full lg:w-auto ${isRTL ? 'lg:mr-[280px]' : 'lg:ml-[280px]'}`}>
        <Header
          user={user}
          language={language}
          toggleLanguage={toggleLanguage}
          toggleRole={toggleRole}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>

    </div>
  );
};

export default App;