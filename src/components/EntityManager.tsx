import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Globe, 
  Phone, 
  Mail, 
  DollarSign, 
  Layers, 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Compass,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Corretor, Empreendimento, LoteData, QuadraData, StatusLote } from '../types';
import { formatCurrency, maskCEP, maskCPF, maskPhone } from '../utils/formatters';

interface EntityManagerProps {
  empreendimentos: Empreendimento[];
  corretores: Corretor[];
  onAddEmpreendimento: (emp: Empreendimento) => void;
  onUpdateEmpreendimento: (emp: Empreendimento) => void;
  onDeleteEmpreendimento: (empId: string) => void;
  onAddLote: (empId: string, quadraNumero: string, lote: LoteData) => void;
  onUpdateLote: (empId: string, quadraNumero: string, lote: LoteData) => void;
  onDeleteLote: (empId: string, quadraNumero: string, loteId: string) => void;
  onAddCorretor: (corretor: Corretor) => void;
  onUpdateCorretor: (corretor: Corretor) => void;
  onDeleteCorretor: (corretorId: string) => void;
  onSelectEmpreendimentoForMap?: (empId: string) => void;
}

export type ManagerTab = 'empreendimentos' | 'lotes' | 'corretores' | 'cidades';

export const EntityManager: React.FC<EntityManagerProps> = ({
  empreendimentos,
  corretores,
  onAddEmpreendimento,
  onUpdateEmpreendimento,
  onDeleteEmpreendimento,
  onAddLote,
  onUpdateLote,
  onDeleteLote,
  onAddCorretor,
  onUpdateCorretor,
  onDeleteCorretor,
  onSelectEmpreendimentoForMap,
}) => {
  const [activeTab, setActiveTab] = useState<ManagerTab>('empreendimentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('todas');

  // Modais de Cadastro & Edição
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Empreendimento | null>(null);

  const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
  const [editingLoteData, setEditingLoteData] = useState<{ empId: string; quadraNumero: string; lote: LoteData } | null>(null);
  const [targetEmpIdForLote, setTargetEmpIdForLote] = useState(empreendimentos[0]?.id || '');
  const [targetQuadraForLote, setTargetQuadraForLote] = useState('Quadra 01');

  const [isCorretorModalOpen, setIsCorretorModalOpen] = useState(false);
  const [editingCorretor, setEditingCorretor] = useState<Corretor | null>(null);

  // Estados dos formulários de Empreendimento
  const [empForm, setEmpForm] = useState({
    nome: '',
    cidade: 'Goiânia',
    uf: 'GO',
    bairro: '',
    localizacao: '',
    enderecoCompleto: '',
    cep: '74000-000',
    latitude: -16.686891,
    longitude: -49.264794,
    pontosReferencia: '',
    descricao: '',
    matriculaGeral: '',
    cartorioRegistro: '',
    areaTotalM2: 100000,
    totalLotes: 20,
    engenheiroResponsavel: '',
    creaNumero: '',
    escalaPlanta: '1:500',
    imagemUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    zona: 'Urbana' as 'Urbana' | 'Expansão Urbana' | 'Rural' | 'Especial',
  });

  // Estados dos formulários de Lote
  const [loteForm, setLoteForm] = useState({
    numero: 'Lote 01',
    quadra: 'Quadra 01',
    area: 360,
    frente: 12,
    fundo: 30,
    valor: 180000,
    status: 'disponivel' as StatusLote,
    compradorNome: '',
  });

  // Estados dos formulários de Corretor
  const [corretorForm, setCorretorForm] = useState({
    nome: '',
    creci: '',
    telefone: '',
    email: '',
    comissaoPadraoPercentual: 5.0,
    chavePix: '',
    banco: '',
    cidadeAtuacao: 'Goiânia / GO',
    status: 'ativo' as 'ativo' | 'inativo',
  });

  // Cidades únicas cadastradas
  const allCities = Array.from(new Set(empreendimentos.map(e => e.cidade))).sort();

  // Abrir Modal de Novo Empreendimento
  const handleOpenNewEmp = () => {
    setEditingEmp(null);
    setEmpForm({
      nome: '',
      cidade: 'Goiânia',
      uf: 'GO',
      bairro: 'Setor Sul',
      localizacao: 'Av. Principal, Km 01',
      enderecoCompleto: 'Av. Principal, Km 01, Setor Sul, Goiânia - GO',
      cep: '74000-000',
      latitude: -16.686891,
      longitude: -49.264794,
      pontosReferencia: '',
      descricao: 'Loteamento residencial planejado com infraestrutura completa.',
      matriculaGeral: 'R-01/123.456 - 1º CRI',
      cartorioRegistro: '1º Cartório de Registro de Imóveis de Goiânia',
      areaTotalM2: 120000,
      totalLotes: 24,
      engenheiroResponsavel: 'Eng. Responsável',
      creaNumero: 'CREA-GO 12345/D',
      escalaPlanta: '1:500',
      imagemUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      zona: 'Urbana',
    });
    setIsEmpModalOpen(true);
  };

  // Abrir Modal de Edição de Empreendimento
  const handleOpenEditEmp = (emp: Empreendimento) => {
    setEditingEmp(emp);
    setEmpForm({
      nome: emp.nome,
      cidade: emp.cidade,
      uf: emp.uf,
      bairro: emp.bairro || '',
      localizacao: emp.localizacao,
      enderecoCompleto: emp.enderecoCompleto || emp.localizacao,
      cep: emp.cep || '74000-000',
      latitude: emp.latitude || -16.686891,
      longitude: emp.longitude || -49.264794,
      pontosReferencia: emp.pontosReferencia || '',
      descricao: emp.descricao,
      matriculaGeral: emp.matriculaGeral,
      cartorioRegistro: emp.cartorioRegistro,
      areaTotalM2: emp.areaTotalM2 || 100000,
      totalLotes: emp.totalLotes,
      engenheiroResponsavel: emp.engenheiroResponsavel || '',
      creaNumero: emp.creaNumero || '',
      escalaPlanta: emp.escalaPlanta || '1:500',
      imagemUrl: emp.imagemUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      zona: emp.zona || 'Urbana',
    });
    setIsEmpModalOpen(true);
  };

  // Salvar Empreendimento (Novo ou Editado)
  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.nome.trim()) return;

    if (editingEmp) {
      const updated: Empreendimento = {
        ...editingEmp,
        nome: empForm.nome,
        cidade: empForm.cidade,
        uf: empForm.uf,
        bairro: empForm.bairro,
        localizacao: empForm.localizacao,
        enderecoCompleto: empForm.enderecoCompleto,
        cep: empForm.cep,
        latitude: Number(empForm.latitude),
        longitude: Number(empForm.longitude),
        pontosReferencia: empForm.pontosReferencia,
        googleMapsUrl: `https://maps.google.com/?q=${empForm.latitude},${empForm.longitude}`,
        descricao: empForm.descricao,
        matriculaGeral: empForm.matriculaGeral,
        cartorioRegistro: empForm.cartorioRegistro,
        areaTotalM2: Number(empForm.areaTotalM2),
        totalLotes: Number(empForm.totalLotes),
        engenheiroResponsavel: empForm.engenheiroResponsavel,
        creaNumero: empForm.creaNumero,
        escalaPlanta: empForm.escalaPlanta,
        imagemUrl: empForm.imagemUrl,
        zona: empForm.zona,
      };
      onUpdateEmpreendimento(updated);
    } else {
      const newId = `emp-${Date.now()}`;
      // Criar quadra inicial padrão com 4 lotes
      const defaultQuadras: QuadraData[] = [
        {
          id: `q-${newId}-1`,
          numero: 'Quadra 01',
          nomeRua: 'Alameda Principal',
          coordenadasSVG: { x: 60, y: 120, width: 420, height: 160 },
          lotes: [
            { id: `l-${newId}-01-01`, numero: 'Lote 01', quadra: 'Quadra 01', area: 360, frente: 12, fundo: 30, valor: 180000, status: 'disponivel', coordenadasSVG: { x: 70, y: 140, width: 65, height: 120 }, dotPosition: { x: 102, y: 200 } },
            { id: `l-${newId}-01-02`, numero: 'Lote 02', quadra: 'Quadra 01', area: 360, frente: 12, fundo: 30, valor: 180000, status: 'disponivel', coordenadasSVG: { x: 140, y: 140, width: 65, height: 120 }, dotPosition: { x: 172, y: 200 } },
            { id: `l-${newId}-01-03`, numero: 'Lote 03', quadra: 'Quadra 01', area: 360, frente: 12, fundo: 30, valor: 180000, status: 'disponivel', coordenadasSVG: { x: 210, y: 140, width: 65, height: 120 }, dotPosition: { x: 242, y: 200 } },
            { id: `l-${newId}-01-04`, numero: 'Lote 04', quadra: 'Quadra 01', area: 420, frente: 14, fundo: 30, valor: 210000, status: 'disponivel', coordenadasSVG: { x: 280, y: 140, width: 75, height: 120 }, dotPosition: { x: 317, y: 200 } },
          ]
        }
      ];

      const newEmp: Empreendimento = {
        id: newId,
        nome: empForm.nome,
        cidade: empForm.cidade,
        uf: empForm.uf,
        bairro: empForm.bairro,
        localizacao: empForm.localizacao,
        enderecoCompleto: empForm.enderecoCompleto,
        cep: empForm.cep,
        latitude: Number(empForm.latitude),
        longitude: Number(empForm.longitude),
        pontosReferencia: empForm.pontosReferencia,
        googleMapsUrl: `https://maps.google.com/?q=${empForm.latitude},${empForm.longitude}`,
        descricao: empForm.descricao,
        matriculaGeral: empForm.matriculaGeral,
        cartorioRegistro: empForm.cartorioRegistro,
        areaTotalM2: Number(empForm.areaTotalM2),
        totalLotes: Number(empForm.totalLotes),
        engenheiroResponsavel: empForm.engenheiroResponsavel,
        creaNumero: empForm.creaNumero,
        escalaPlanta: empForm.escalaPlanta,
        imagemUrl: empForm.imagemUrl,
        zona: empForm.zona,
        infraestrutura: [
          'Rede de Água Tratada',
          'Energia Elétrica',
          'Asfalto com Meio-Fio',
          'Iluminação Pública em LED'
        ],
        quadras: defaultQuadras,
      };
      onAddEmpreendimento(newEmp);
    }
    setIsEmpModalOpen(false);
  };

  // Abrir Modal de Novo Lote
  const handleOpenNewLote = (empId?: string, quadraNumero?: string) => {
    setEditingLoteData(null);
    if (empId) setTargetEmpIdForLote(empId);
    if (quadraNumero) setTargetQuadraForLote(quadraNumero);
    setLoteForm({
      numero: `Lote ${Math.floor(10 + Math.random() * 89)}`,
      quadra: quadraNumero || 'Quadra 01',
      area: 360,
      frente: 12,
      fundo: 30,
      valor: 180000,
      status: 'disponivel',
      compradorNome: '',
    });
    setIsLoteModalOpen(true);
  };

  // Abrir Modal de Edição de Lote
  const handleOpenEditLote = (empId: string, quadraNumero: string, lote: LoteData) => {
    setEditingLoteData({ empId, quadraNumero, lote });
    setTargetEmpIdForLote(empId);
    setTargetQuadraForLote(quadraNumero);
    setLoteForm({
      numero: lote.numero,
      quadra: quadraNumero,
      area: lote.area,
      frente: lote.frente,
      fundo: lote.fundo,
      valor: lote.valor,
      status: lote.status,
      compradorNome: lote.compradorNome || '',
    });
    setIsLoteModalOpen(true);
  };

  // Salvar Lote
  const handleSaveLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteForm.numero.trim()) return;

    if (editingLoteData) {
      const updatedLote: LoteData = {
        ...editingLoteData.lote,
        numero: loteForm.numero,
        area: Number(loteForm.area),
        frente: Number(loteForm.frente),
        fundo: Number(loteForm.fundo),
        valor: Number(loteForm.valor),
        status: loteForm.status,
        compradorNome: loteForm.status === 'vendido' || loteForm.status === 'reservado' ? loteForm.compradorNome : undefined,
      };
      onUpdateLote(targetEmpIdForLote, targetQuadraForLote, updatedLote);
    } else {
      const newLote: LoteData = {
        id: `lote-${Date.now()}`,
        numero: loteForm.numero,
        quadra: targetQuadraForLote,
        area: Number(loteForm.area),
        frente: Number(loteForm.frente),
        fundo: Number(loteForm.fundo),
        valor: Number(loteForm.valor),
        status: loteForm.status,
        compradorNome: loteForm.status === 'vendido' || loteForm.status === 'reservado' ? loteForm.compradorNome : undefined,
        coordenadasSVG: { x: 70 + Math.floor(Math.random() * 200), y: 140, width: 65, height: 120 },
        dotPosition: { x: 100 + Math.floor(Math.random() * 200), y: 200 },
      };
      onAddLote(targetEmpIdForLote, targetQuadraForLote, newLote);
    }
    setIsLoteModalOpen(false);
  };

  // Abrir Modal de Novo Corretor
  const handleOpenNewCorretor = () => {
    setEditingCorretor(null);
    setCorretorForm({
      nome: '',
      creci: '',
      telefone: '',
      email: '',
      comissaoPadraoPercentual: 5.0,
      chavePix: '',
      banco: '',
      cidadeAtuacao: 'Goiânia / GO',
      status: 'ativo',
    });
    setIsCorretorModalOpen(true);
  };

  // Abrir Modal de Edição de Corretor
  const handleOpenEditCorretor = (corretor: Corretor) => {
    setEditingCorretor(corretor);
    setCorretorForm({
      nome: corretor.nome,
      creci: corretor.creci,
      telefone: corretor.telefone,
      email: corretor.email,
      comissaoPadraoPercentual: corretor.comissaoPadraoPercentual,
      chavePix: corretor.chavePix || '',
      banco: corretor.banco || '',
      cidadeAtuacao: corretor.cidadeAtuacao || 'Goiânia / GO',
      status: corretor.status || 'ativo',
    });
    setIsCorretorModalOpen(true);
  };

  // Salvar Corretor
  const handleSaveCorretor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corretorForm.nome.trim()) return;

    if (editingCorretor) {
      const updated: Corretor = {
        ...editingCorretor,
        nome: corretorForm.nome,
        creci: corretorForm.creci,
        telefone: corretorForm.telefone,
        email: corretorForm.email,
        comissaoPadraoPercentual: Number(corretorForm.comissaoPadraoPercentual),
        chavePix: corretorForm.chavePix,
        banco: corretorForm.banco,
        cidadeAtuacao: corretorForm.cidadeAtuacao,
        status: corretorForm.status,
      };
      onUpdateCorretor(updated);
    } else {
      const newCorretor: Corretor = {
        id: `corretor-${Date.now()}`,
        nome: corretorForm.nome,
        creci: corretorForm.creci,
        telefone: corretorForm.telefone,
        email: corretorForm.email,
        comissaoPadraoPercentual: Number(corretorForm.comissaoPadraoPercentual),
        chavePix: corretorForm.chavePix,
        banco: corretorForm.banco,
        cidadeAtuacao: corretorForm.cidadeAtuacao,
        status: corretorForm.status,
        totalVendas: 0,
      };
      onAddCorretor(newCorretor);
    }
    setIsCorretorModalOpen(false);
  };

  // Filtrar empreendimentos por texto e cidade
  const filteredEmpreendimentos = empreendimentos.filter(emp => {
    const matchCity = selectedCityFilter === 'todas' || emp.cidade === selectedCityFilter;
    const matchText = emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.localizacao.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCity && matchText;
  });

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO DE GESTÃO 100% EDITÁVEL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight">
              Gestão & Cadastros 100% Editáveis
            </h1>
            <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              SISTEMA COMPLETO
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Gerencie e personalize todos os empreendimentos, mapas geográficos GPS, quadras, lotes, cidades e equipe de corretores/vendedores em tempo real.
          </p>
        </div>

        {/* BOTÃO PRINCIPAL DE CADASTRO CONFORME ABA */}
        <div className="flex items-center space-x-2">
          {activeTab === 'empreendimentos' && (
            <button
              onClick={handleOpenNewEmp}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Empreendimento</span>
            </button>
          )}

          {activeTab === 'lotes' && (
            <button
              onClick={() => handleOpenNewLote()}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Lote</span>
            </button>
          )}

          {activeTab === 'corretores' && (
            <button
              onClick={handleOpenNewCorretor}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar Vendedor</span>
            </button>
          )}
        </div>
      </div>

      {/* ABAS DE SELEÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('empreendimentos')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'empreendimentos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Empreendimentos & GPS ({empreendimentos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lotes')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'lotes'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Quadras & Lotes</span>
          </button>

          <button
            onClick={() => setActiveTab('corretores')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'corretores'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Vendedores & Corretores ({corretores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cidades')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'cidades'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Cidades & Polos ({allCities.length})</span>
          </button>
        </div>

        {/* CAMPO DE BUSCA RÁPIDA */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, local ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>
      </div>

      {/* ABA 1: EMPREENDIMENTOS & GPS */}
      {activeTab === 'empreendimentos' && (
        <div className="space-y-4">
          {/* BARRA DE FILTRO DE CIDADES */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-mono font-semibold whitespace-nowrap">Filtrar Cidade:</span>
            <button
              onClick={() => setSelectedCityFilter('todas')}
              className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCityFilter === 'todas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas as Cidades ({empreendimentos.length})
            </button>
            {allCities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCityFilter(city)}
                className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCityFilter === city
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {city} ({empreendimentos.filter(e => e.cidade === city).length})
              </button>
            ))}
          </div>

          {/* LISTA DE CARDS DE EMPREENDIMENTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmpreendimentos.map(emp => {
              const totalLotesCalc = emp.quadras.reduce((acc, q) => acc + q.lotes.length, 0);
              const disponiveisCount = emp.quadras.reduce((acc, q) => acc + q.lotes.filter(l => l.status === 'disponivel').length, 0);
              const vendidosCount = emp.quadras.reduce((acc, q) => acc + q.lotes.filter(l => l.status === 'vendido').length, 0);
              const vgvTotal = emp.quadras.reduce((acc, q) => acc + q.lotes.reduce((sum, l) => sum + l.valor, 0), 0);

              return (
                <div 
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  {/* IMAGEM & BADGE DE CIDADE */}
                  <div className="relative h-36 bg-slate-800 overflow-hidden">
                    <img 
                      src={emp.imagemUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'} 
                      alt={emp.nome} 
                      className="w-full h-full object-cover opacity-85 hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono font-bold bg-slate-900/90 text-white border border-slate-700 px-2 py-0.5 rounded-md backdrop-blur-md">
                        {emp.cidade} - {emp.uf}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-md backdrop-blur-md">
                        {emp.zona || 'Urbano'}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <h3 className="font-heading font-bold text-sm leading-snug drop-shadow-sm truncate">
                        {emp.nome}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-mono truncate flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{emp.bairro || emp.localizacao}</span>
                      </p>
                    </div>
                  </div>

                  {/* CORPO DO CARD */}
                  <div className="p-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">Lotes</span>
                          <span className="font-bold text-slate-800">{totalLotesCalc}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 font-mono block">Disponíveis</span>
                          <span className="font-bold text-emerald-700">{disponiveisCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block">Vendidos</span>
                          <span className="font-bold text-slate-700">{vendidosCount}</span>
                        </div>
                      </div>

                      {/* COORDENADAS GPS */}
                      <div className="bg-emerald-50/60 border border-emerald-200/70 p-2.5 rounded-xl font-mono text-[11px] space-y-1 text-slate-700">
                        <div className="flex items-center justify-between text-slate-800">
                          <span className="font-bold flex items-center space-x-1">
                            <Compass className="w-3.5 h-3.5 text-emerald-600" />
                            <span>GPS Coordenadas:</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">WGS84</span>
                        </div>
                        <p className="text-slate-600 truncate">
                          Lat: <strong className="text-slate-900">{emp.latitude?.toFixed(6) || '-16.686891'}</strong> | Lng: <strong className="text-slate-900">{emp.longitude?.toFixed(6) || '-49.264794'}</strong>
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          CEP: {emp.cep || '74000-000'} • Matrícula: {emp.matriculaGeral}
                        </p>
                      </div>
                    </div>

                    {/* AÇÕES */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleOpenEditEmp(emp)}
                        className="flex-1 flex items-center justify-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        title="Editar todos os dados do empreendimento"
                      >
                        <Edit3 className="w-3 h-3 text-slate-600" />
                        <span>Editar</span>
                      </button>

                      {onSelectEmpreendimentoForMap && (
                        <button
                          onClick={() => onSelectEmpreendimentoForMap(emp.id)}
                          className="flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          title="Visualizar no Mapa de Lotes"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Ver Mapa</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir o empreendimento "${emp.nome}"?`)) {
                            onDeleteEmpreendimento(emp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Excluir Empreendimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: QUADRAS & LOTES */}
      {activeTab === 'lotes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-mono font-bold text-slate-700">Selecione o Empreendimento:</label>
              <select
                value={targetEmpIdForLote}
                onChange={(e) => setTargetEmpIdForLote(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {empreendimentos.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} ({emp.cidade} - {emp.uf})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenNewLote(targetEmpIdForLote)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Lote neste Empreendimento</span>
            </button>
          </div>

          {/* LISTAGEM DE QUADRAS E LOTES DO EMPREENDIMENTO SELECIONADO */}
          {(() => {
            const currentEmp = empreendimentos.find(e => e.id === targetEmpIdForLote) || empreendimentos[0];
            if (!currentEmp) return null;

            return (
              <div className="space-y-4">
                {currentEmp.quadras.map(quadra => (
                  <div key={quadra.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-heading font-bold text-sm text-emerald-400">{quadra.numero}</span>
                        <span className="text-xs text-slate-400 font-mono">• {quadra.nomeRua || 'Rua Interna'}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                          {quadra.lotes.length} lotes
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenNewLote(currentEmp.id, quadra.numero)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Lote nesta Quadra</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                            <th className="p-3">Lote</th>
                            <th className="p-3">Área (m²)</th>
                            <th className="p-3">Frente x Fundo</th>
                            <th className="p-3">Valor de Tabela</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Comprador</th>
                            <th className="p-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {quadra.lotes.map(lote => (
                            <tr key={lote.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 font-bold text-slate-900 font-mono">{lote.numero}</td>
                              <td className="p-3 font-mono text-slate-700">{lote.area} m²</td>
                              <td className="p-3 font-mono text-slate-600">{lote.frente}m x {lote.fundo}m</td>
                              <td className="p-3 font-bold text-emerald-700 font-mono">{formatCurrency(lote.valor)}</td>
                              <td className="p-3">
                                {lote.status === 'disponivel' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Disponível
                                  </span>
                                )}
                                {lote.status === 'reservado' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Reservado
                                  </span>
                                )}
                                {lote.status === 'vendido' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Vendido
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600 font-medium">
                                {lote.compradorNome || <span className="text-slate-400 italic">—</span>}
                              </td>
                              <td className="p-3 text-right space-x-1">
                                <button
                                  onClick={() => handleOpenEditLote(currentEmp.id, quadra.numero, lote)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                                  title="Editar Lote"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Excluir ${lote.numero} da ${quadra.numero}?`)) {
                                      onDeleteLote(currentEmp.id, quadra.numero, lote.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Excluir Lote"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ABA 3: VENDEDORES & CORRETORES */}
      {activeTab === 'corretores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {corretores.map(corretor => (
            <div
              key={corretor.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono border border-slate-800">
                      {corretor.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm">{corretor.nome}</h4>
                      <p className="text-[11px] font-mono font-bold text-emerald-700">CRECI {corretor.creci}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    corretor.status === 'inativo'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {corretor.status === 'inativo' ? 'INATIVO' : 'ATIVO'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Comissão Padrão:</span>
                    <span className="font-bold text-emerald-700">{corretor.comissaoPadraoPercentual}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Telefone/WhatsApp:</span>
                    <span className="font-bold text-slate-800">{corretor.telefone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="text-slate-700 truncate max-w-[140px]">{corretor.email}</span>
                  </div>
                  {corretor.chavePix && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Chave PIX:</span>
                      <span className="text-slate-800 truncate max-w-[140px]">{corretor.chavePix}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenEditCorretor(corretor)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer mr-2"
                >
                  <Edit3 className="w-3 h-3 text-slate-600" />
                  <span>Editar Dados</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Excluir corretor(a) ${corretor.nome}?`)) {
                      onDeleteCorretor(corretor.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Excluir Corretor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 4: CIDADES & POLOS IMOBILIÁRIOS */}
      {activeTab === 'cidades' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCities.map(city => {
              const empsInCity = empreendimentos.filter(e => e.cidade === city);
              const totalLotes = empsInCity.reduce((acc, e) => acc + e.quadras.reduce((sum, q) => sum + q.lotes.length, 0), 0);
              const totalDisponiveis = empsInCity.reduce((acc, e) => acc + e.quadras.reduce((sum, q) => sum + q.lotes.filter(l => l.status === 'disponivel').length, 0), 0);
              const totalVgv = empsInCity.reduce((acc, e) => acc + e.quadras.reduce((sum, q) => sum + q.lotes.reduce((v, l) => v + l.valor, 0), 0), 0);

              return (
                <div key={city} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm">{city}</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {empsInCity.length} Empreendimento(s)
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lotes Totais:</span>
                      <span className="font-bold text-slate-800">{totalLotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Disponíveis:</span>
                      <span className="font-bold text-emerald-700">{totalDisponiveis}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">VGV Total:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(totalVgv)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">Empreendimentos neste polo:</span>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {empsInCity.map(e => (
                        <li key={e.id} className="flex items-center justify-between">
                          <span className="truncate font-medium">{e.nome}</span>
                          <span className="text-[10px] font-mono text-slate-400">{e.bairro || 'Central'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CADASTRO / EDIÇÃO DE EMPREENDIMENTO */}
      {/* ======================================================== */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-bold text-base">
                  {editingEmp ? `Editar Empreendimento: ${editingEmp.nome}` : 'Cadastrar Novo Empreendimento'}
                </h3>
              </div>
              <button
                onClick={() => setIsEmpModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmp} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* DADOS BÁSICOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-mono font-bold text-slate-700 block mb-1">Nome do Empreendimento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reserva Bosque dos Ipês"
                    value={empForm.nome}
                    onChange={(e) => setEmpForm({ ...empForm, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Cidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Goiânia"
                    value={empForm.cidade}
                    onChange={(e) => setEmpForm({ ...empForm, cidade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1">UF *</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      placeholder="GO"
                      value={empForm.uf}
                      onChange={(e) => setEmpForm({ ...empForm, uf: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-slate-700 block mb-1">Zona</label>
                    <select
                      value={empForm.zona}
                      onChange={(e) => setEmpForm({ ...empForm, zona: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Urbana">Urbana</option>
                      <option value="Expansão Urbana">Expansão</option>
                      <option value="Rural">Rural</option>
                      <option value="Especial">Especial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Setor Alto da Colina"
                    value={empForm.bairro}
                    onChange={(e) => setEmpForm({ ...empForm, bairro: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="74000-000"
                    value={empForm.cep}
                    onChange={(e) => setEmpForm({ ...empForm, cep: maskCEP(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-mono font-bold text-slate-700 block mb-1">Endereço Completo / Logradouro</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. dos Ipês, Km 04, Setor Alto da Colina"
                    value={empForm.enderecoCompleto}
                    onChange={(e) => setEmpForm({ ...empForm, enderecoCompleto: e.target.value, localizacao: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* DADOS GEOGRÁFICOS GPS */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-900">
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span className="font-mono font-bold text-xs">Coordenadas Geográficas GPS (WGS84)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-slate-700 block mb-1 text-[11px]">Latitude Decimal (ex: -16.686891)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={empForm.latitude}
                      onChange={(e) => setEmpForm({ ...empForm, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-slate-700 block mb-1 text-[11px]">Longitude Decimal (ex: -49.264794)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={empForm.longitude}
                      onChange={(e) => setEmpForm({ ...empForm, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-slate-700 block mb-1 text-[11px]">Pontos de Referência</label>
                    <input
                      type="text"
                      placeholder="Ex: A 5 min do Shopping Flamboyant, acesso fácil pela GO-020"
                      value={empForm.pontosReferencia}
                      onChange={(e) => setEmpForm({ ...empForm, pontosReferencia: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* DADOS JURÍDICOS & CARTORIAIS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Matrícula Geral no CRI</label>
                  <input
                    type="text"
                    placeholder="Ex: R-04/182.490 - 1º CRI"
                    value={empForm.matriculaGeral}
                    onChange={(e) => setEmpForm({ ...empForm, matriculaGeral: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Cartório de Registro</label>
                  <input
                    type="text"
                    placeholder="Ex: 1º Cartório de Registro de Imóveis"
                    value={empForm.cartorioRegistro}
                    onChange={(e) => setEmpForm({ ...empForm, cartorioRegistro: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Engenheiro Responsável</label>
                  <input
                    type="text"
                    placeholder="Ex: Eng. Roberto Vasconcelos"
                    value={empForm.engenheiroResponsavel}
                    onChange={(e) => setEmpForm({ ...empForm, engenheiroResponsavel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">CREA / ART</label>
                  <input
                    type="text"
                    placeholder="Ex: CREA-GO 12489/D"
                    value={empForm.creaNumero}
                    onChange={(e) => setEmpForm({ ...empForm, creaNumero: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* DESCRIÇÃO E IMAGEM */}
              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Descrição Comercial</label>
                <textarea
                  rows={2}
                  value={empForm.descricao}
                  onChange={(e) => setEmpForm({ ...empForm, descricao: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">URL da Foto de Capa / Fachada</label>
                <input
                  type="url"
                  value={empForm.imagemUrl}
                  onChange={(e) => setEmpForm({ ...empForm, imagemUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* BOTÕES DE SALVAMENTO */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingEmp ? 'Salvar Alterações' : 'Cadastrar Empreendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CADASTRO / EDIÇÃO DE LOTE */}
      {/* ======================================================== */}
      {isLoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-bold text-sm">
                  {editingLoteData ? `Editar ${editingLoteData.lote.numero}` : 'Cadastrar Novo Lote'}
                </h3>
              </div>
              <button
                onClick={() => setIsLoteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLote} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Número do Lote *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lote 05"
                    value={loteForm.numero}
                    onChange={(e) => setLoteForm({ ...loteForm, numero: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Quadra *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quadra 01"
                    value={targetQuadraForLote}
                    onChange={(e) => setTargetQuadraForLote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Área (m²)</label>
                  <input
                    type="number"
                    value={loteForm.area}
                    onChange={(e) => setLoteForm({ ...loteForm, area: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Frente (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={loteForm.frente}
                    onChange={(e) => setLoteForm({ ...loteForm, frente: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Fundo (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={loteForm.fundo}
                    onChange={(e) => setLoteForm({ ...loteForm, fundo: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Valor de Tabela (R$)</label>
                <input
                  type="number"
                  value={loteForm.valor}
                  onChange={(e) => setLoteForm({ ...loteForm, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Status do Lote</label>
                <select
                  value={loteForm.status}
                  onChange={(e) => setLoteForm({ ...loteForm, status: e.target.value as StatusLote })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="disponivel">Disponível</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
              </div>

              {(loteForm.status === 'vendido' || loteForm.status === 'reservado') && (
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Nome do Comprador / Titular</label>
                  <input
                    type="text"
                    placeholder="Nome completo do comprador"
                    value={loteForm.compradorNome}
                    onChange={(e) => setLoteForm({ ...loteForm, compradorNome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLoteModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Salvar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CADASTRO / EDIÇÃO DE VENDEDOR / CORRETOR */}
      {/* ======================================================== */}
      {isCorretorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-bold text-sm">
                  {editingCorretor ? `Editar Vendedor: ${editingCorretor.nome}` : 'Cadastrar Novo Vendedor / Corretor'}
                </h3>
              </div>
              <button
                onClick={() => setIsCorretorModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCorretor} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Nome Completo do Corretor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={corretorForm.nome}
                  onChange={(e) => setCorretorForm({ ...corretorForm, nome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">CRECI *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 34.521-GO"
                    value={corretorForm.creci}
                    onChange={(e) => setCorretorForm({ ...corretorForm, creci: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">% Comissão Padrão</label>
                  <input
                    type="number"
                    step="0.1"
                    value={corretorForm.comissaoPadraoPercentual}
                    onChange={(e) => setCorretorForm({ ...corretorForm, comissaoPadraoPercentual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(62) 99999-9999"
                    value={corretorForm.telefone}
                    onChange={(e) => setCorretorForm({ ...corretorForm, telefone: maskPhone(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={corretorForm.status}
                    onChange={(e) => setCorretorForm({ ...corretorForm, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">E-mail Profissional</label>
                <input
                  type="email"
                  placeholder="corretor@imobgestao.com.br"
                  value={corretorForm.email}
                  onChange={(e) => setCorretorForm({ ...corretorForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Chave PIX para Comissões</label>
                <input
                  type="text"
                  placeholder="CPF, E-mail ou Celular"
                  value={corretorForm.chavePix}
                  onChange={(e) => setCorretorForm({ ...corretorForm, chavePix: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Cidade / Região de Atuação</label>
                <input
                  type="text"
                  placeholder="Ex: Goiânia / Senador Canedo"
                  value={corretorForm.cidadeAtuacao}
                  onChange={(e) => setCorretorForm({ ...corretorForm, cidadeAtuacao: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCorretorModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Salvar Corretor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
