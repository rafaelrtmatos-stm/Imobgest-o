import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  PlusCircle, 
  Info,
  Filter,
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Maximize2,
  Printer,
  Sparkles,
  ArrowUpDown,
  Compass,
  ShieldCheck,
  Zap,
  Droplets,
  Trees,
  Check,
  Table,
  SlidersHorizontal,
  ChevronRight,
  Globe,
  Edit3,
  ExternalLink,
  X
} from 'lucide-react';
import { Empreendimento, LoteData } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ArchitecturalBlueprintMap } from './ArchitecturalBlueprintMap';
import { GeographicLocationMap } from './GeographicLocationMap';
import { GlobalEmpreendimentosMap } from './GlobalEmpreendimentosMap';

interface LotMapExplorerProps {
  empreendimentos: Empreendimento[];
  selectedEmpreendimentoId: string;
  onSelectEmpreendimento: (id: string) => void;
  onSelectLotForSale: (empId: string, quadraNumero: string, lote: LoteData) => void;
  onUpdateCoordinates?: (empId: string, lat: number, lng: number, address?: string) => void;
  onNavigateToManager?: (tab?: 'empreendimentos' | 'lotes' | 'corretores' | 'cidades') => void;
}

export const LotMapExplorer: React.FC<LotMapExplorerProps> = ({
  empreendimentos,
  selectedEmpreendimentoId,
  onSelectEmpreendimento,
  onSelectLotForSale,
  onUpdateCoordinates,
  onNavigateToManager,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'available'>('name');
  const [activeTab, setActiveTab] = useState<'mapa' | 'geo_localizacao' | 'tabela_lotes' | 'infraestrutura' | 'documentos'>('mapa');
  const [showGlobalMap, setShowGlobalMap] = useState<boolean>(true);

  const currentEmp = empreendimentos.find(e => e.id === selectedEmpreendimentoId) || empreendimentos[0];
  const [selectedLot, setSelectedLot] = useState<{ quadra: string; lot: LoteData } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponivel' | 'reservado' | 'vendido'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customMapImage, setCustomMapImage] = useState<string | null>(currentEmp?.mapaCustomImage || null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Lista única de cidades com contagem
  const cities = useMemo(() => {
    const cityMap: { [key: string]: number } = {};
    empreendimentos.forEach(e => {
      const cityKey = `${e.cidade} - ${e.uf}`;
      cityMap[cityKey] = (cityMap[cityKey] || 0) + 1;
    });
    return Object.entries(cityMap).map(([city, count]) => ({ city, count }));
  }, [empreendimentos]);

  // Filtragem e ordenação dos empreendimentos
  const filteredEmpreendimentos = useMemo(() => {
    let list = empreendimentos.filter(e => {
      if (selectedCity === 'all') return true;
      return `${e.cidade} - ${e.uf}` === selectedCity;
    });

    return list.sort((a, b) => {
      if (sortBy === 'name') return a.nome.localeCompare(b.nome);
      if (sortBy === 'city') return a.cidade.localeCompare(b.cidade);
      if (sortBy === 'available') {
        const getAvail = (emp: Empreendimento) => 
          emp.quadras.flatMap(q => q.lotes).filter(l => l.status === 'disponivel').length;
        return getAvail(b) - getAvail(a);
      }
      return 0;
    });
  }, [empreendimentos, selectedCity, sortBy]);

  // Contagem de status dos lotes do empreendimento ativo
  const lotStats = useMemo(() => {
    let totalLotes = 0;
    let disponiveis = 0;
    let reservados = 0;
    let vendidos = 0;
    let vgvTotal = 0;

    currentEmp?.quadras.forEach(q => {
      q.lotes.forEach(l => {
        totalLotes++;
        vgvTotal += l.valor;
        if (l.status === 'disponivel') disponiveis++;
        else if (l.status === 'reservado') reservados++;
        else if (l.status === 'vendido') vendidos++;
      });
    });

    return { totalLotes, disponiveis, reservados, vendidos, vgvTotal };
  }, [currentEmp]);

  const handleLotClick = (quadra: string, lot: LoteData) => {
    setSelectedLot({ quadra, lot });
  };

  const handleDirectSell = (quadra: string, lot: LoteData) => {
    if (currentEmp) {
      onSelectLotForSale(currentEmp.id, quadra, lot);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomMapImage(event.target.result as string);
          setIsUploadModalOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* MAPA GLOBAL DE EMPREENDIMENTOS (SATÉLITE & NORMAL COM PINOS INTERATIVOS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Visão Panorâmica no Mapa
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowGlobalMap(!showGlobalMap)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{showGlobalMap ? 'Ocultar Mapa Global' : '🛰️ Exibir Mapa Global (Satélite & Ruas)'}</span>
          </button>
        </div>

        {showGlobalMap && (
          <GlobalEmpreendimentosMap
            empreendimentos={empreendimentos}
            selectedEmpreendimentoId={currentEmp?.id}
            onSelectEmpreendimento={(empId) => {
              onSelectEmpreendimento(empId);
              setSelectedLot(null);
              const targetEmp = empreendimentos.find(e => e.id === empId);
              if (targetEmp) {
                setCustomMapImage(targetEmp.mapaCustomImage || null);
              }
              const elem = document.getElementById('selected-emp-main-card');
              if (elem) {
                elem.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        )}
      </div>

      {/* SEÇÃO SUPERIOR: CLASSIFICAÇÃO POR CIDADE & LISTAGEM LIMPA COM APENAS OS NOMES */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Selecione o Empreendimento
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtre por cidade e clique no nome para abrir todas as opções, planta interativa e tabela de vendas
            </p>
          </div>

          {/* CLASSIFICAÇÃO / ORDENAÇÃO */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Ordenar por:</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSortBy('name')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'name' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nome
              </button>
              <button
                type="button"
                onClick={() => setSortBy('city')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'city' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cidade
              </button>
              <button
                type="button"
                onClick={() => setSortBy('available')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'available' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mais Disponíveis
              </button>
            </div>
          </div>
        </div>

        {/* BARRA DE CLASSIFICAÇÃO POR CIDADE */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCity('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              selectedCity === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>Todas as Cidades</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCity === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {empreendimentos.length}
            </span>
          </button>

          {cities.map(({ city, count }) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                selectedCity === city
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 opacity-80" />
              <span>{city}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCity === city ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* LISTA LIMPA COM APENAS OS NOMES DOS EMPREENDIMENTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {filteredEmpreendimentos.map((emp) => {
            const isSelected = emp.id === currentEmp.id;
            const empDisponiveis = emp.quadras.flatMap(q => q.lotes).filter(l => l.status === 'disponivel').length;
            const empTotal = emp.quadras.flatMap(q => q.lotes).length;

            return (
              <button
                key={emp.id}
                type="button"
                id={`btn-emp-${emp.id}`}
                onClick={() => {
                  onSelectEmpreendimento(emp.id);
                  setSelectedLot(null);
                  setCustomMapImage(emp.mapaCustomImage || null);
                }}
                className={`p-3.5 rounded-xl text-left border-2 transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-emerald-50/50 border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isSelected 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      {emp.cidade} - {emp.uf}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      {empDisponiveis} disp.
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-sm text-slate-900 truncate mt-1">
                    {emp.nome}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center">
                  {isSelected ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO EMPREENDIMENTO SELECIONADO COM SUAS ABAS E OPÇÕES INTERESSANTES */}
      {currentEmp && (
        <div id="selected-emp-main-card" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0 scroll-mt-20">
          {/* CABEÇALHO DO EMPREENDIMENTO SELECIONADO */}
          <div className="p-6 sm:p-7 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    {currentEmp.cidade} - {currentEmp.uf}
                  </span>
                  <span className="text-xs text-slate-400">
                    {currentEmp.bairro ? `${currentEmp.bairro} • ` : ''}{currentEmp.localizacao}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                  {currentEmp.nome}
                </h1>
              </div>

              {/* AÇÕES RÁPIDAS */}
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateToManager && (
                  <button
                    type="button"
                    onClick={() => onNavigateToManager('empreendimentos')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    title="Editar informações completas deste empreendimento"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar Empreendimento</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Anexar Planta</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer no-print"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* BARRA DE MÉTRICAS RÁPIDAS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Total de Lotes</span>
                <span className="text-xl font-heading font-bold text-white">{lotStats.totalLotes}</span>
              </div>
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                <span className="text-[11px] text-emerald-300 uppercase font-bold block flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
                  Disponíveis
                </span>
                <span className="text-xl font-heading font-bold text-emerald-400">{lotStats.disponiveis}</span>
              </div>
              <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/30">
                <span className="text-[11px] text-amber-300 uppercase font-bold block">Reservados</span>
                <span className="text-xl font-heading font-bold text-amber-400">{lotStats.reservados}</span>
              </div>
              <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
                <span className="text-[11px] text-rose-300 uppercase font-bold block">Vendidos</span>
                <span className="text-xl font-heading font-bold text-rose-400">{lotStats.vendidos}</span>
              </div>
            </div>
          </div>

          {/* SISTEMA DE ABAS COM OPÇÕES INTERESSANTES */}
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 pt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('mapa')}
              className={`px-4 py-3 font-heading font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'mapa'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>Planta Técnica & Mapa de Lotes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('geo_localizacao')}
              className={`px-4 py-3 font-heading font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'geo_localizacao'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Localização Geográfica & GPS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tabela_lotes')}
              className={`px-4 py-3 font-heading font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'tabela_lotes'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl'
              }`}
            >
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Tabela de Lotes & Preços ({lotStats.totalLotes})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('infraestrutura')}
              className={`px-4 py-3 font-heading font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'infraestrutura'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Memorial & Infraestrutura</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`px-4 py-3 font-heading font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'documentos'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Documentos & Planta Anexa</span>
            </button>
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="p-6">
            {/* ABA 1: PLANTA TÉCNICA & MAPA INTERATIVO COM BOLINHAS */}
            {activeTab === 'mapa' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* MAPA SVG BLUEPRINT (2 COLUNAS) */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* FILTROS DE STATUS DAS BOLINHAS */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Filtrar Bolinhas no Mapa:
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'all'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                          }`}
                        >
                          Todos ({lotStats.totalLotes})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('disponivel')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                            statusFilter === 'disponivel'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Disponíveis ({lotStats.disponiveis})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('reservado')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                            statusFilter === 'reservado'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>Reservados ({lotStats.reservados})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('vendido')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                            statusFilter === 'vendido'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Vendidos ({lotStats.vendidos})</span>
                        </button>
                      </div>
                    </div>

                    {/* COMPONENTE DO MAPA BLUEPRINT */}
                    <ArchitecturalBlueprintMap
                      empreendimento={currentEmp}
                      selectedLot={selectedLot}
                      statusFilter={statusFilter}
                      onSelectLot={handleLotClick}
                      onDirectSell={handleDirectSell}
                      customMapImage={customMapImage}
                    />

                    {/* LEGENDA */}
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-t border-slate-100">
                      <div className="flex items-center space-x-4 font-semibold">
                        <span className="flex items-center space-x-1.5 text-slate-800">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Verde: Disponível p/ Venda</span>
                        </span>
                        <span className="flex items-center space-x-1.5 text-slate-800">
                          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                          <span>Âmbar: Reservado</span>
                        </span>
                        <span className="flex items-center space-x-1.5 text-slate-800">
                          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                          <span>Vermelho: Vendido</span>
                        </span>
                      </div>
                      <span className="text-slate-500">
                        Clique na bolinha numerada para vender imediatamente
                      </span>
                    </div>
                  </div>

                  {/* PAINEL LATERAL DE VENDA RÁPIDA (1 COLUNA) */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 sticky top-20 space-y-4">
                      {selectedLot ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                              <span className="text-xs font-bold text-emerald-800 uppercase">
                                {selectedLot.quadra} • {currentEmp.nome}
                              </span>
                              <h3 className="text-xl font-heading font-extrabold text-slate-900">
                                {selectedLot.lot.numero}
                              </h3>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                              selectedLot.lot.status === 'disponivel'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : selectedLot.lot.status === 'reservado'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {selectedLot.lot.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="text-slate-500 font-bold block mb-0.5">Área Total:</span>
                              <span className="text-base font-heading font-extrabold text-slate-900">{selectedLot.lot.area} m²</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="text-slate-500 font-bold block mb-0.5">Dimensões:</span>
                              <span className="text-base font-heading font-extrabold text-slate-900">{selectedLot.lot.frente}m x {selectedLot.lot.fundo}m</span>
                            </div>
                          </div>

                          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300 space-y-2">
                            <span className="text-xs text-emerald-900 uppercase font-bold">Valor de Tabela:</span>
                            <p className="text-2xl font-heading font-extrabold text-emerald-800">
                              {formatCurrency(selectedLot.lot.valor)}
                            </p>
                            <div className="pt-2 border-t border-emerald-200 text-xs text-slate-700 space-y-1">
                              <p>• Sinal de Entrada (10%): <strong className="text-slate-900">{formatCurrency(selectedLot.lot.valor * 0.1)}</strong></p>
                              <p>• 120 parcelas diretas de: <strong className="text-slate-900">{formatCurrency((selectedLot.lot.valor * 0.9) / 120)}</strong></p>
                            </div>
                          </div>

                          {selectedLot.lot.compradorNome && (
                            <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl text-xs space-y-0.5">
                              <span className="text-rose-800 font-bold block">Adquirente Cadastrado:</span>
                              <p className="text-slate-900 font-medium">{selectedLot.lot.compradorNome}</p>
                            </div>
                          )}

                          <button
                            type="button"
                            id="btn-sell-selected-lot-main"
                            onClick={() => onSelectLotForSale(currentEmp.id, selectedLot.quadra, selectedLot.lot)}
                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                          >
                            <PlusCircle className="w-5 h-5" />
                            <span>
                              {selectedLot.lot.status === 'disponivel' ? 'Vender Este Lote Agora' : 'Elaborar Proposta / Minuta'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-10 space-y-2.5">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
                            <Info className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-heading font-bold text-slate-900">Clique na Bolinha no Mapa</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            Você pode dar zoom na planta para ler as medidas e clicar diretamente na bolinha para iniciar a venda com os dados preenchidos.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: LOCALIZAÇÃO GEOGRÁFICA & GPS */}
            {activeTab === 'geo_localizacao' && (
              <div className="space-y-4">
                <GeographicLocationMap
                  empreendimento={currentEmp}
                  onUpdateCoordinates={onUpdateCoordinates}
                />
              </div>
            )}

            {/* ABA 3: TABELA DE LOTES & PREÇOS (INVENTÁRIO) */}
            {activeTab === 'tabela_lotes' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por lote, quadra ou comprador..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-emerald-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('disponivel')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === 'disponivel' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      Disponíveis
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('reservado')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === 'reservado' ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-300'
                      }`}
                    >
                      Reservados
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('vendido')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === 'vendido' ? 'bg-rose-600 text-white' : 'bg-white text-rose-800 border border-rose-300'
                      }`}
                    >
                      Vendidos
                    </button>
                  </div>
                </div>

                {/* TABELA DE LOTES */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Quadra</th>
                        <th className="py-3 px-4">Lote</th>
                        <th className="py-3 px-4">Área ($m^2$)</th>
                        <th className="py-3 px-4">Dimensões</th>
                        <th className="py-3 px-4">Valor de Tabela</th>
                        <th className="py-3 px-4">Entrada (10%)</th>
                        <th className="py-3 px-4">120x Estimado</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentEmp.quadras.flatMap(q => 
                        q.lotes.map(l => ({ quadra: q, lot: l }))
                      )
                      .filter(({ quadra, lot }) => {
                        const matchSearch = searchTerm === '' || 
                          lot.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          quadra.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lot.compradorNome && lot.compradorNome.toLowerCase().includes(searchTerm.toLowerCase()));
                        const matchStatus = statusFilter === 'all' || lot.status === statusFilter;
                        return matchSearch && matchStatus;
                      })
                      .map(({ quadra, lot }) => (
                        <tr key={lot.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{quadra.numero}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{lot.numero}</td>
                          <td className="py-3 px-4 font-bold text-emerald-700">{lot.area} m²</td>
                          <td className="py-3 px-4 text-slate-600">{lot.frente}m x {lot.fundo}m</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(lot.valor)}</td>
                          <td className="py-3 px-4 text-slate-700">{formatCurrency(lot.valor * 0.1)}</td>
                          <td className="py-3 px-4 text-slate-700">{formatCurrency((lot.valor * 0.9) / 120)}/mês</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center space-x-1 ${
                              lot.status === 'disponivel'
                                ? 'bg-emerald-100 text-emerald-800'
                                : lot.status === 'reservado'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                lot.status === 'disponivel' ? 'bg-emerald-500' :
                                lot.status === 'reservado' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}></span>
                              <span>{lot.status.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLot({ quadra: quadra.numero, lot });
                                onSelectLotForSale(currentEmp.id, quadra.numero, lot);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              Vender
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 3: MEMORIAL & INFRAESTRUTURA */}
            {activeTab === 'infraestrutura' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DADOS CADASTRAIS E REGISTRAIS */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-heading font-bold text-base text-slate-900 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <span>Registro Imobiliário & Memorial</span>
                    </h3>
                    <div className="space-y-2 text-xs text-slate-700 divide-y divide-slate-200">
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Matrícula Geral:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.matriculaGeral}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Cartório Competente:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.cartorioRegistro}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Responsável Técnico:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.engenheiroResponsavel}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Registro CREA:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.creaNumero}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Área Total Gleba:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.areaTotalM2?.toLocaleString('pt-BR')} m²</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <strong className="text-slate-600">Escala da Planta:</strong>
                        <span className="font-bold text-slate-900">{currentEmp.escalaPlanta || '1:500'}</span>
                      </div>
                    </div>
                  </div>

                  {/* ITENS DE INFRAESTRUTURA APROVADOS */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-heading font-bold text-base text-slate-900 flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Infraestrutura Completa Entregue</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-slate-800">Rede de Energia Elétrica & LED</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <Droplets className="w-4 h-4 text-sky-500" />
                        <span className="font-semibold text-slate-800">Água Tratada & Esgotamento</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-800">Asfalto CBUQ com Guias</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <Trees className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-800">Área Verde Preservada & Lago</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <span className="font-semibold text-slate-800">Portaria com Controle 24h</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-slate-800">Clube, Piscina & Quadras</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 text-xs text-slate-700 space-y-2">
                  <h4 className="font-heading font-bold text-sm text-emerald-900">Descrição Comercial & Posicionamento</h4>
                  <p className="leading-relaxed">{currentEmp.descricao}</p>
                </div>
              </div>
            )}

            {/* ABA 4: DOCUMENTOS & PLANTA ANEXA */}
            {activeTab === 'documentos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm">Anexar Nova Planta Técnica</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Substitua ou anexe o arquivo PDF ou imagem de alta resolução da planta deste empreendimento.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all inline-flex items-center space-x-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Selecionar Arquivo PDF / Imagem</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center mx-auto">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm">Imprimir Memorial e Planta Cadastral</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Gere uma via para impressão direta com carimbo do memorial e relação de quadras.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all inline-flex items-center space-x-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Documento</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE UPLOAD DE PLANTA PDF / IMAGEM */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-heading font-bold text-slate-900 text-base">
                Anexar Planta Técnica ({currentEmp?.nome})
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Selecione uma imagem ou arquivo PDF da planta aprovada do loteamento para carregar na área do visualizador.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50">
              <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <label className="block text-xs font-bold text-slate-700 cursor-pointer">
                <span className="text-emerald-700 underline">Clique para selecionar o arquivo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400 block mt-1">
                Formatos: PNG, JPG, WebP ou PDF vetorial
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

