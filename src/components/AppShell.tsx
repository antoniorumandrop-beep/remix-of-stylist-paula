import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, User, Bell, Globe, Sparkles, Shirt } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  const tabs = [
    { path: '/app/search', icon: Search, label: t('search') },
    { path: '/app/for-you', icon: Home, label: t('forYou') },
    { path: '/app/build-your-style', icon: Sparkles, label: t('buildYourStyle') },
    { path: '/app/fitting-room', icon: Shirt, label: t('fittingRoom') },
    { path: '/app/saved', icon: Heart, label: t('saved') },
    { path: '/app/alerts', icon: Bell, label: t('alerts') },
    { path: '/app/profile', icon: User, label: t('profile') },
  ];

  const toggleLang = () => setLang(lang === 'en' ? 'pl' : 'en');

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border p-8">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/app/search')} className="font-display text-2xl">Paula</button>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map(tab => {
            const active = location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  active ? 'bg-card text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 min-w-0 lg:pb-0 overflow-y-auto" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border flex justify-around py-2 z-50">
        {tabs.map(tab => {
          const active = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
