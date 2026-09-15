import React, { useState, useRef } from 'react';
import { 
  Settings, 
  Palette, 
  Tag, 
  Database, 
  Upload, 
  Download, 
  RotateCcw, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  Sun, 
  Moon,
  X
} from 'lucide-react';
import { AppState, Category } from '../types';
import { SUPPORTED_CURRENCIES, formatCurrency, getCurrencySymbol } from '../utils/currency';
import { exportToJsonFile, normalizeState } from '../utils/storage';

interface SettingsViewProps {
  state: AppState;
  onUpdateSettings: (updates: Partial<AppState>) => void;
  onAddCategory: (cat: Category) => void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onRestoreState: (importedState: AppState) => void;
  onResetAll: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateSettings,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRestoreState,
  onResetAll,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category modal state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🏷️');
  const [catColor, setCatColor] = useState('#6366f1');
  const [catBudget, setCatBudget] = useState('0');
  const [catError, setCatError] = useState('');

  const currencySymbol = getCurrencySymbol(state.currency);

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('🏷️');
    setCatColor('#6366f1');
    setCatBudget('0');
    setCatError('');
    setIsCatModalOpen(true);
  };

  const openEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatIcon(c.icon);
    setCatColor(c.color || '#6366f1');
    setCatBudget(c.budget.toString());
    setCatError('');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Please provide a category name.');
      return;
    }

    const budgetNum = parseFloat(catBudget) || 0;

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: catName.trim(),
        icon: catIcon.trim() || '🏷️',
        color: catColor,
        budget: budgetNum,
      });
      onShowToast(`Category ${catName} updated`, 'success');
    } else {
      const newId = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      onAddCategory({
        id: newId,
        name: catName.trim(),
        icon: catIcon.trim() || '🏷️',
        color: catColor,
        budget: budgetNum,
      });
      onShowToast(`Category ${catName} created`, 'success');
    }

    setIsCatModalOpen(false);
  };

  // JSON Import handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const normalized = normalizeState(parsed);
        onRestoreState(normalized);
        onShowToast('Backup restored successfully!', 'success');
      } catch (err) {
        console.error(err);
        onShowToast('Invalid JSON file format.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 light:text-slate-900">
            Preferences & Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalize app defaults, customize budget limits, and manage your data.
          </p>
        </div>
        <Settings className="w-6 h-6 text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalization Section */}
        <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 light:border-slate-200 pb-3">
            <Palette className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 light:text-slate-900">
              Personalization
            </h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Application Name
              </label>
              <input
                type="text"
                value={state.appName}
                onChange={(e) => onUpdateSettings({ appName: e.target.value.trim() || 'VARAVU&SELAVU' })}
                className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Display Currency
              </label>
              <select
                value={state.currency}
                onChange={(e) => onUpdateSettings({ currency: e.target.value })}
                className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Monthly Target Budget Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={state.budgetLimit}
                  onChange={(e) => onUpdateSettings({ budgetLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Set to 0 to disable monthly spending alert on dashboard.
              </p>
            </div>

            {/* Appearance Theme */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 light:bg-slate-100 border border-slate-800 light:border-slate-200">
              <div className="flex items-center gap-2">
                {state.theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                    {state.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Switch between sleek dark and crisp light theme
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: state.theme === 'dark' ? 'light' : 'dark' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  state.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 light:border-slate-200 pb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 light:text-slate-900">
              Data & Backups
            </h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              {state.appName || 'VARAVU&SELAVU'} stores your financial data securely in your browser&apos;s local storage. You can create JSON backups or restore previous data anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  exportToJsonFile(state);
                  onShowToast('JSON backup downloaded', 'success');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800 light:bg-slate-100 text-xs font-bold text-slate-200 light:text-slate-800 hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800 light:bg-slate-100 text-xs font-bold text-slate-200 light:text-slate-800 hover:bg-slate-700 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import JSON Backup</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 light:border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-400 block">Clear All Stored Data</span>
                  <span className="text-[11px] text-slate-400">
                    Wipe all records to deliver a fresh, clean slate
                  </span>
                </div>

                <button
                  onClick={onResetAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Management Section */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 light:border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 light:text-slate-900">
                Categories & Budget Allocation ({state.categories.length})
              </h3>
              <p className="text-xs text-slate-400">
                Configure icons, colors, and monthly category budget limits
              </p>
            </div>
          </div>

          <button
            onClick={openAddCategory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.categories.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl border border-slate-800 light:border-slate-200 bg-slate-950/40 light:bg-slate-50 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${c.color || '#6366f1'}20` }}
                >
                  {c.icon}
                </div>

                <div className="min-w-0">
                  <strong className="text-xs sm:text-sm font-semibold text-slate-100 light:text-slate-900 block truncate">
                    {c.name}
                  </strong>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {c.budget > 0 ? `Budget: ${formatCurrency(c.budget, state.currency)}` : 'No budget set'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditCategory(c)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                  title="Edit Category"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {state.categories.length > 3 && (
                  <button
                    onClick={() => onDeleteCategory(c.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {catError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {catError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Travel, Books, Pets"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Emoji Icon
                  </label>
                  <input
                    type="text"
                    required
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="✈️"
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-center text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Color Accent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="w-10 h-9 p-0.5 rounded-xl border border-slate-800 light:border-slate-300 bg-slate-950 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-400 uppercase">{catColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Monthly Budget Target ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">0 = No limit</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
