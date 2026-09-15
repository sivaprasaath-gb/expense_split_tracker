import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Plus, 
  Calendar,
  Wallet
} from 'lucide-react';
import { getMonthLabel, getAdjacentMonthKey, getMonthKey } from '../utils/storage';

interface NavbarProps {
  appName: string;
  selectedMonth: string;
  onMonthChange: (newMonth: string) => void;
  availableMonths: string[];
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onOpenAddModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  appName,
  selectedMonth,
  onMonthChange,
  availableMonths,
  theme,
  onThemeToggle,
  onOpenAddModal,
}) => {
  const currentRealMonth = getMonthKey(new Date());
  const isCurrentMonth = selectedMonth === currentRealMonth;

  // Guarantee that selectedMonth is present in the options list so the select element never falls back
  const displayedMonths = React.useMemo(() => {
    const list = availableMonths.includes(selectedMonth)
      ? [...availableMonths]
      : [selectedMonth, ...availableMonths];
    return Array.from(new Set(list)).sort().reverse();
  }, [availableMonths, selectedMonth]);

  // Reusable month navigator component for responsive layout
  const renderMonthNavigator = (isMobile: boolean = false) => (
    <div
      className={`flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 light:bg-slate-100 border border-slate-700/60 light:border-slate-200 rounded-xl p-0.5 sm:p-1 shadow-inner ${
        isMobile ? 'w-full max-w-xs justify-between' : ''
      }`}
    >
      <button
        onClick={() => onMonthChange(getAdjacentMonthKey(selectedMonth, -1))}
        className="p-1 sm:p-1.5 hover:bg-slate-700 light:hover:bg-slate-200 rounded-lg text-slate-300 light:text-slate-700 transition-colors"
        title="Previous Month"
        aria-label="Previous Month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative flex items-center px-1.5 sm:px-2 py-0.5 flex-1 justify-center">
        <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-label="Select month"
          className="bg-transparent text-xs sm:text-sm font-bold text-slate-100 light:text-slate-900 cursor-pointer focus:outline-none pr-1"
        >
          {displayedMonths.map((m) => (
            <option key={m} value={m} className="bg-slate-900 text-white light:bg-white light:text-slate-900">
              {getMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onMonthChange(getAdjacentMonthKey(selectedMonth, 1))}
        className="p-1 sm:p-1.5 hover:bg-slate-700 light:hover:bg-slate-200 rounded-lg text-slate-300 light:text-slate-700 transition-colors"
        title="Next Month"
        aria-label="Next Month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={() => onMonthChange(currentRealMonth)}
          className="ml-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-md transition-colors whitespace-nowrap"
          title="Jump to current month"
        >
          Current
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md border-b transition-colors duration-200 bg-slate-900/90 dark:bg-slate-950/90 border-slate-800 light:bg-white/95 light:border-slate-200">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand - Always visible with full app name & icon */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 block leading-none">
                Tracker & Split
              </span>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 light:text-slate-900 leading-tight">
                {appName}
              </h1>
            </div>
          </div>

          {/* Desktop/Tablet Month Navigator (Centered) */}
          <div className="hidden sm:flex items-center">
            {renderMonthNavigator(false)}
          </div>

          {/* Actions (Theme + Add Transaction) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onThemeToggle}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/60 light:bg-slate-100 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 shrink-0"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden text-xs font-semibold">Add</span>
            </button>
          </div>
        </div>

        {/* Mobile Month Navigator (Row 2, Centered with ample space) */}
        <div className="sm:hidden mt-2 pt-2 border-t border-slate-800/50 light:border-slate-200/70 flex items-center justify-center">
          {renderMonthNavigator(true)}
        </div>
      </div>
    </header>
  );
};
