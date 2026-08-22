import React from 'react';
import { FileText, Home, Users, DatabaseBackup, Search } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'contratos' | 'clientes' | 'backup';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
}

const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'backup', label: 'Backup', icon: DatabaseBackup },
];

export function Navbar({ activeTab, onChangeTab, onSearch, searchTerm }: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            IG
          </div>
          <span className="font-heading font-bold text-slate-900 tracking-tight">ImobGestão</span>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  active ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="relative flex-1 w-full sm:max-w-xs sm:ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar cliente, contrato ou venda..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </header>
  );
}
