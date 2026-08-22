import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Map, 
  FileCode2, 
  FileCheck,
  PenTool, 
  DollarSign, 
  ListFilter, 
  PlusCircle, 
  Settings, 
  Layers,
  Globe,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  UserCog,
  Shield,
  KeyRound
} from 'lucide-react';
import { AppUser } from '../types';

export type ActiveTab = 
  | 'dashboard'
  | 'empreendimentos'
  | 'map_explorer' 
  | 'clientes'
  | 'sales_form' 
  | 'sales_list'
  | 'word_templates' 
  | 'contract_viewer' 
  | 'commissions' 
  | 'company_settings'
  | 'usuarios';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewSale: () => void;
  pendingSignaturesCount: number;
  currentUser: AppUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewSale,
  pendingSignaturesCount,
  currentUser,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      description: 'Métricas, volume de vendas e visão geral',
      icon: LayoutDashboard,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      activeMatch: activeTab === 'dashboard',
    },
    {
      id: 'empreendimentos' as ActiveTab,
      label: 'Início & Mapa Global',
      description: 'Mapa com satélite, pinos e lotes',
      icon: Globe,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
      activeMatch: activeTab === 'empreendimentos' || activeTab === 'map_explorer',
    },
    {
      id: 'clientes' as ActiveTab,
      label: 'Clientes & Compradores',
      description: 'Gestão de cadastros e documentos',
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      activeMatch: activeTab === 'clientes',
    },
    {
      id: 'sales_list' as ActiveTab,
      label: 'Gestão de Vendas',
      description: 'Histórico, propostas e reservas',
      icon: ListFilter,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      activeMatch: activeTab === 'sales_list' || activeTab === 'sales_form',
    },
    {
      id: 'word_templates' as ActiveTab,
      label: 'Modelos & Documentos',
      description: 'Geração de contratos (À Vista, Parcelado e Exclusividade)',
      icon: FileText,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
      activeMatch: activeTab === 'word_templates' || activeTab === 'contract_viewer',
    },
    {
      id: 'commissions' as ActiveTab,
      label: 'Comissões & Relatórios',
      description: 'Repasses e controle de corretores',
      icon: DollarSign,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      activeMatch: activeTab === 'commissions',
    },
    ...(isAdmin ? [{
      id: 'usuarios' as ActiveTab,
      label: 'Gestão de Usuários',
      description: 'Adicionar e gerenciar equipe e corretores',
      icon: UserCog,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      activeMatch: activeTab === 'usuarios',
    }] : []),
    {
      id: 'company_settings' as ActiveTab,
      label: 'Configurações do Sistema',
      description: 'Modelos Word (.docx) e dados da empresa',
      icon: Settings,
      color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      activeMatch: activeTab === 'company_settings',
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const getActiveTabTitle = () => {
    const found = menuItems.find(m => m.activeMatch);
    return found ? found.label : 'Dashboard';
  };

  return (
    <>
      <header className="bg-white text-slate-800 sticky top-0 z-40 border-b border-slate-200 shadow-xs backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* BOTÃO HAMBÚRGUER + LOGO */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                id="btn-hamburger-menu"
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-300 font-semibold text-xs shadow-xs transition-all cursor-pointer group active:scale-95"
                title="Abrir Menu de Navegação"
                aria-label="Abrir Menu"
              >
                <Menu className="w-5 h-5 text-slate-700 group-hover:text-emerald-600 transition-colors" />
                <span className="hidden sm:inline font-bold">MENU</span>
              </button>

              {/* LOGO & MARCA */}
              <div 
                className="flex items-center space-x-3 cursor-pointer group shrink-0"
                onClick={() => handleSelectTab('dashboard')}
                id="brand-header"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-slate-900 border border-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-all duration-200">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                      IMOBGESTÃO
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200">
                      PRO
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 hidden sm:flex items-center space-x-1 font-medium">
                    <span className="text-emerald-600 font-bold">●</span>
                    <span className="truncate max-w-[200px]">{getActiveTabTitle()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ATALHOS RÁPIDOS NA BARRA SUPERIOR (DESKTOP) */}
            <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => handleSelectTab('dashboard')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleSelectTab('empreendimentos')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'empreendimentos' || activeTab === 'map_explorer'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mapa & Lotes</span>
              </button>

              <button
                onClick={() => handleSelectTab('clientes')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'clientes'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Clientes</span>
              </button>

              <button
                onClick={() => handleSelectTab('sales_list')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'sales_list' || activeTab === 'sales_form'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Vendas</span>
              </button>

              <button
                onClick={() => handleSelectTab('word_templates')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'word_templates' || activeTab === 'contract_viewer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Modelos & Documentos</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleSelectTab('usuarios')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'usuarios'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'text-purple-700 hover:text-purple-900 hover:bg-purple-100/70'
                  }`}
                  title="Gestão de Usuários e Equipe"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>Usuários</span>
                </button>
              )}

              <button
                onClick={() => handleSelectTab('company_settings')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'company_settings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Config</span>
              </button>
            </nav>

            {/* BOTÕES DE AÇÃO RÁPIDA & USUÁRIO LOGADO */}
            <div className="flex items-center space-x-2.5">
              <button
                id="btn-quick-new-sale"
                onClick={onNewSale}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 sm:px-4 py-2 rounded-xl text-xs transition-all shadow-xs border border-emerald-500 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Venda</span>
                <span className="sm:hidden">Vender</span>
              </button>

              {/* CARD RESUMIDO DO USUÁRIO LOGADO */}
              {currentUser && (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <div 
                    onClick={() => isAdmin && handleSelectTab('usuarios')}
                    className={`flex items-center space-x-2 p-1.5 rounded-xl border transition-all ${
                      isAdmin ? 'bg-purple-50/80 border-purple-200 hover:bg-purple-100 cursor-pointer' : 'bg-slate-50 border-slate-200'
                    }`}
                    title={isAdmin ? 'Gerenciar Usuários' : currentUser.nome}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isAdmin ? 'bg-purple-900 text-purple-200' : 'bg-slate-800 text-emerald-400'
                    }`}>
                      {currentUser.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="hidden xl:block text-left pr-1">
                      <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                        {currentUser.nome}
                      </p>
                      <p className="text-[10px] text-purple-700 font-semibold font-mono">
                        {isAdmin ? 'ADMINISTRADOR' : 'CORRETOR'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                    title="Encerrar Sessão / Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGAÇÃO INFERIOR PARA CELULAR (MOBILE BOTTOM BAR) */}
      <nav 
        id="mobile-bottom-nav" 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around no-print"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-emerald-600 scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('empreendimentos')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'empreendimentos' || activeTab === 'map_explorer' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className={`w-5 h-5 ${activeTab === 'empreendimentos' || activeTab === 'map_explorer' ? 'text-emerald-600 scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-0.5">Mapa</span>
        </button>

        {/* BOTÃO CENTRAL DE NOVA VENDA */}
        <button
          type="button"
          onClick={onNewSale}
          className="flex flex-col items-center justify-center -mt-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white p-3 rounded-full shadow-lg shadow-emerald-600/40 border-2 border-white cursor-pointer transition-transform"
          title="Nova Venda"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('sales_list')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'sales_list' || activeTab === 'sales_form' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className={`w-5 h-5 ${activeTab === 'sales_list' || activeTab === 'sales_form' ? 'text-emerald-600 scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-0.5">Vendas</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            isMenuOpen ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>

      {/* DRAWER LATERAL DO MENU HAMBÚRGUER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print">
          {/* BACKDROP ESCURO COM BLUR */}
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* PAINEL DESLIZANTE LATERAL */}
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-sm sm:max-w-md bg-slate-900 text-white shadow-2xl border-r border-slate-800 flex flex-col justify-between animate-in slide-in-from-left duration-300">
              
              {/* CABEÇALHO DO MENU HAMBÚRGUER */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-white tracking-tight">
                      Navegação Geral
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Selecione um módulo
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Fechar Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PERFIL DO USUÁRIO LOGADO NO TOPO DO DRAWER */}
              {currentUser && (
                <div className="mx-4 mt-4 p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {currentUser.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {currentUser.nome}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {currentUser.email}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isAdmin ? 'ADMINISTRADOR MASTER' : 'CORRETOR / USUÁRIO'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* LISTA DE OPÇÕES / ABAS */}
              <div className="p-4 sm:p-6 space-y-2 overflow-y-auto flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-2 mb-2">
                  Módulos do Sistema
                </p>

                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = item.activeMatch;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer group ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-400/40 font-bold'
                          : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-white/20 border-white/30 text-white' : item.color
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">
                            {item.label}
                          </p>
                          <p className={`text-xs truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1 ${
                        isSelected ? 'text-white' : 'text-slate-500'
                      }`} />
                    </button>
                  );
                })}

                {/* BOTÃO EM DESTAQUE: NOVA VENDA */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNewSale();
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>INICIAR NOVA VENDA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* RODAPÉ DO MENU HAMBÚRGUER */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-500">ImobGestão Pro v2.5</span>
                  <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Ambiente Seguro</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
