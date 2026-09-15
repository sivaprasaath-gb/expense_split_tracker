import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Users2, 
  Repeat, 
  Settings 
} from 'lucide-react';
import { AppState } from '../types';

interface BottomNavProps {
  activeTab: AppState['activeTab'];
  onTabChange: (tab: AppState['activeTab']) => void;
  splitDebtsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  splitDebtsCount,
}) => {
  const navItems: Array<{
    id: AppState['activeTab'];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'history', label: 'History', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'split', label: 'Split', icon: Users2, badge: splitDebtsCount > 0 ? splitDebtsCount : undefined },
    { id: 'subscriptions', label: 'Recurring', icon: Repeat },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 dark:bg-slate-950/90 light:bg-white/95 backdrop-blur-lg border-t border-slate-800 light:border-slate-200 safe-area-bottom">
      <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-indigo-400 light:text-indigo-600 font-semibold'
                  : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
