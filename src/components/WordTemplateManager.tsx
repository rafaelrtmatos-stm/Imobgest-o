import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Search, 
  FileCheck,
  Zap,
  HelpCircle,
  X,
  Settings,
  ShieldCheck,
  Calendar,
  Layers,
  Clock,
  ExternalLink,
  History,
  Building2,
  DollarSign,
  User,
  Share2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { 
  AppUser, 
  Cliente, 
  CompanyConfig, 
  Corretor, 
  DocumentFieldMapping, 
  DocumentTemplate, 
  Empreendimento, 
  SaleRecord, 
  TipoModeloDocumento 
} from '../types';
import { 
  SYSTEM_FIELDS_CATALOG, 
  parseUploadedDocxFile, 
  SystemFieldDefinition, 
  findSystemFieldByTag,
  normalizeTag 
} from '../utils/docxProcessor';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { ModularContractGenerator } from './ModularContractGenerator';
import { ContratoModularRecord } from '../types/modularContract';

interface WordTemplateManagerProps {
  templates: DocumentTemplate[];
  onSaveTemplates: (templates: DocumentTemplate[]) => void;
  sales?: SaleRecord[];
  clientes?: Cliente[];
  empreendimentos?: Empreendimento[];
  corretores?: Corretor[];
  currentUser?: AppUser | null;
  companyConfig?: CompanyConfig;
  onOpenGenerator: (template?: DocumentTemplate, sale?: SaleRecord, defaultMode?: 'a_vista' | 'parcelado') => void;
  onOpenDigitalSignatureFlow?: (contratoData: any) => void;
  isSettingsMode?: boolean;
  onNavigateToSettings?: () => void;
}

const STORAGE_KEY_MODULAR_CONTRACTS = 'imobgestao_modular_contracts_v1';

export const WordTemplateManager: React.FC<WordTemplateManagerProps> = ({
  templates,
  onSaveTemplates,
  sales = [],
  clientes = [],
  empreendimentos = [],
  corretores = [],
  currentUser = null,
  companyConfig,
  onOpenGenerator,
  onOpenDigitalSignatureFlow,
  isSettingsMode = false,
  onNavigateToSettings,
}) => {
  // 1. Aba principal interna em "Modelos e Documentos":
  // 'cards' = Os 3 Cards Oficiais (À Vista, Parcelado, Exclusividade)
  // 'exclusividade_modular' = Gerador Modular de Exclusividade integrado
  // 'historico' = Histórico Central de Contratos
  // 'modelos_docx' = Gerenciar Arquivos .docx
  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'exclusividade_modular' | 'historico' | 'modelos_docx'>('cards');

  // Filtros de listagem de modelos .docx
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [historicoSearch, setHistoricoSearch] = useState<string>('');
  const [historicoStatusFilter, setHistoricoStatusFilter] = useState<string>('all');

  // Estados do Modal de Cadastro / Edição de Modelo .docx
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: Envio, 2: Reconhecimento, 3: Pré-visualização

  // Formulário do Wizard de template .docx
  const [formData, setFormData] = useState<{
    nome: string;
    tipoDocumento: TipoModeloDocumento;
    descricao: string;
    fileName: string;
    fileBase64?: string;
    rawText: string;
    contentHtml: string;
    tags: DocumentFieldMapping[];
    customMappings: Record<string, string>;
  }>({
    nome: '',
    tipoDocumento: 'recibo_quitacao',
    descricao: '',
    fileName: '',
    fileBase64: '',
    rawText: '',
    contentHtml: '',
    tags: [],
    customMappings: {},
  });

  // Modal de mapeamento de campo customizado / não reconhecido
  const [customFieldModal, setCustomFieldModal] = useState<{
    isOpen: boolean;
    rawTag: string;
    cleanTag: string;
    selectedSystemFieldId: string;
    customValue: string;
  }>({
    isOpen: false,
    rawTag: '',
    cleanTag: '',
    selectedSystemFieldId: '',
    customValue: '',
  });

  // Visualizador rápido de modelo
  const [viewingTemplate, setViewingTemplate] = useState<DocumentTemplate | null>(null);

  // Upload state & ref
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingTemplateId, setReplacingTemplateId] = useState<string | null>(null);

  // Carregar contratos modulares do localStorage para o histórico unificado
  const [modularContracts, setModularContracts] = useState<ContratoModularRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODULAR_CONTRACTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Erro ao carregar contratos modulares:', e);
    }
    return [];
  });

  // Handler para abrir o gerador À Vista
  const handleOpenAVistaGenerator = () => {
    const tplVista = templates.find(t => 
      t.tipoDocumento === 'recibo_quitacao' || 
      t.tipoDocumento === 'venda_a_vista' || 
      t.tipoDocumento === 'terreno_a_vista' ||
      t.tipoDocumento === 'recibo'
    ) || templates[0];

    onOpenGenerator(tplVista, undefined, 'a_vista');
  };

  // Handler para abrir o gerador Parcelado
  const handleOpenParceladoGenerator = () => {
    const tplParcelado = templates.find(t => 
      t.tipoDocumento === 'compromisso_parcelado' || 
      t.tipoDocumento === 'venda_parcelada' ||
      t.tipoDocumento === 'terreno_parcelado'
    ) || templates[0];

    onOpenGenerator(tplParcelado, undefined, 'parcelado');
  };

  // Handler para abrir o gerador Modular de Exclusividade
  const handleOpenExclusividadeGenerator = () => {
    setActiveSubTab('exclusividade_modular');
  };

  // Abrir modal de novo modelo .docx
  const handleOpenNewModal = () => {
    setEditingTemplateId(null);
    setFormData({
      nome: '',
      tipoDocumento: 'recibo_quitacao',
      descricao: '',
      fileName: '',
      fileBase64: '',
      rawText: '',
      contentHtml: '',
      tags: [],
      customMappings: {},
    });
    setWizardStep(1);
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar modelo existente
  const handleEditTemplate = (tpl: DocumentTemplate) => {
    setEditingTemplateId(tpl.id);
    setFormData({
      nome: tpl.nome,
      tipoDocumento: tpl.tipoDocumento,
      descricao: tpl.descricao || '',
      fileName: tpl.fileName,
      fileBase64: tpl.fileBase64,
      rawText: tpl.rawText,
      contentHtml: tpl.contentHtml || '',
      tags: tpl.tags,
      customMappings: tpl.customMappings || {},
    });
    setWizardStep(2);
    setUploadError(null);
    setIsModalOpen(true);
  };

  // Duplicar modelo
  const handleDuplicateTemplate = (tpl: DocumentTemplate) => {
    const duplicated: DocumentTemplate = {
      ...tpl,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nome: `${tpl.nome} (Cópia)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...templates];
    onSaveTemplates(updated);
  };

  // Excluir modelo
  const handleDeleteTemplate = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente excluir o modelo "${nome}" da biblioteca?`)) {
      const updated = templates.filter(t => t.id !== id);
      onSaveTemplates(updated);
    }
  };

  // Processar arquivo .docx selecionado no wizard
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('Por favor, selecione um arquivo válido do Microsoft Word no formato .docx');
      return;
    }

    setIsProcessingFile(true);
    setUploadError(null);

    try {
      const parsed = await parseUploadedDocxFile(file);
      setFormData(prev => ({
        ...prev,
        nome: prev.nome || file.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' '),
        fileName: file.name,
        fileBase64: parsed.fileBase64,
        rawText: parsed.rawText,
        contentHtml: parsed.contentHtml,
        tags: parsed.tags,
      }));
      setWizardStep(2);
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao ler o documento Word.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Salvar modelo final
  const handleSaveTemplate = () => {
    if (!formData.nome.trim()) {
      alert('Por favor, preencha o nome do modelo.');
      return;
    }

    const now = new Date().toISOString();
    if (editingTemplateId) {
      const updated = templates.map(t => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            nome: formData.nome,
            tipoDocumento: formData.tipoDocumento,
            descricao: formData.descricao,
            fileName: formData.fileName,
            fileBase64: formData.fileBase64 || t.fileBase64,
            rawText: formData.rawText || t.rawText,
            contentHtml: formData.contentHtml || t.contentHtml,
            tags: formData.tags,
            customMappings: formData.customMappings,
            updatedAt: now,
          };
        }
        return t;
      });
      onSaveTemplates(updated);
    } else {
      const newTpl: DocumentTemplate = {
        id: `tpl_${Date.now()}`,
        nome: formData.nome,
        tipoDocumento: formData.tipoDocumento,
        descricao: formData.descricao,
        fileName: formData.fileName,
        fileBase64: formData.fileBase64,
        rawText: formData.rawText,
        contentHtml: formData.contentHtml,
        tags: formData.tags,
        customMappings: formData.customMappings,
        isDefault: false,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      };
      onSaveTemplates([newTpl, ...templates]);
    }

    setIsModalOpen(false);
  };

  // Se o usuário estiver no gerador modular de exclusividade, renderiza diretamente
  if (activeSubTab === 'exclusividade_modular') {
    return (
      <div className="space-y-4">
        {/* Barra superior de retorno aos Cards */}
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white px-5 py-3 rounded-2xl border-2 border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('cards')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Modelos e Documentos</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-md flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              GERADOR DE EXCLUSIVIDADE
            </span>
          </div>
        </div>

        {/* Gerador Modular Oficial */}
        <ModularContractGenerator
          currentUser={currentUser}
          wordTemplates={templates}
          clientes={clientes}
          empreendimentos={empreendimentos}
          corretores={corretores}
          sales={sales}
          onOpenDigitalSignatureFlow={onOpenDigitalSignatureFlow}
          onNavigateToTemplates={() => setActiveSubTab('cards')}
        />
      </div>
    );
  }

  // Filtragem dos modelos .docx cadastrados
  const filteredTemplates = templates.filter(t => {
    const matchTipo = filterTipo === 'all' || t.tipoDocumento === filterTipo;
    const matchSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.descricao && t.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchTipo && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. CABEÇALHO UNIFICADO DE MODELOS E DOCUMENTOS */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                CENTRAL DE CONTRATOS
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Modelos & Documentos Oficiais
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Modelos e Documentos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Local exclusivo para emissão e geração de contratos em DOCX/PDF, histórico unificado e autenticação de assinaturas digitais.
            </p>
          </div>

          {/* Abas de Navegação Interna */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'cards'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Modelos Disponíveis</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('historico')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'historico'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico Central</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('modelos_docx')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'modelos_docx'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Gerenciar .docx</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-ABA: OS 3 CARDS INICIAIS OBRIGATÓRIOS (À VISTA, PARCELADO, EXCLUSIVIDADE) */}
      {activeSubTab === 'cards' && (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-heading font-extrabold text-slate-900">
                  Modelos Oficiais de Contratos
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Selecione o modelo desejado para abrir o gerador correspondente e emitir o contrato.
                </p>
              </div>
            </div>

            {/* GRID DOS 3 CARDS OBRIGATÓRIOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* CARD 1: À VISTA */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 shadow-sm transition-all duration-200 flex flex-col justify-between group hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      PAGAMENTO INTEGRAL
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-heading font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                      À VISTA
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Recibo de Quitação & Compra e Venda
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Emissão de contrato e recibo oficial de quitação para transações com pagamento total à vista, com identificação das partes e do imóvel.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Minuta em DOCX e PDF</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quitação Imediata Registrada</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assinatura Digital Integrada</span>
                    </div>
                  </div>
                </div>

                {/* BOTÃO OBRIGATÓRIO [ GERAR CONTRATO ] */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleOpenAVistaGenerator}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-heading font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-emerald-600 active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>GERAR CONTRATO</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: PARCELADO */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-500 shadow-sm transition-all duration-200 flex flex-col justify-between group hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="bg-blue-50 text-blue-800 border border-blue-300 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      FINANCIAMENTO DIRETO
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-heading font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                      PARCELADO
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Compromisso de Compra e Venda
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Emissão de compromisso parcelado com detalhamento de entrada, quantidade de parcelas mensais, juros, índices de reajuste e vencimentos.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cálculo Automático de Parcelas</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reajuste Monetário (IPCA/IGP-M)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>Assinatura Digital Integrada</span>
                    </div>
                  </div>
                </div>

                {/* BOTÃO OBRIGATÓRIO [ GERAR CONTRATO ] */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleOpenParceladoGenerator}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-heading font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-blue-600 active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>GERAR CONTRATO</span>
                  </button>
                </div>
              </div>

              {/* CARD 3: EXCLUSIVIDADE */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-900 shadow-sm transition-all duration-200 flex flex-col justify-between group hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="bg-slate-100 text-slate-800 border border-slate-300 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      CORRETAGEM & EXCLUSIVIDADE
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-300">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-heading font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                      EXCLUSIVIDADE
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Gerador Modular com Blocos Opcionais
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Gerador modular com blocos opcionais de contratante, imóvel, dados comerciais, comissão calculada, autorizações de divulgação e link direto.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Blocos e Campos Configuráveis</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cálculo de Prazo & Corretagem</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link de Preenchimento WhatsApp</span>
                    </div>
                  </div>
                </div>

                {/* BOTÃO OBRIGATÓRIO [ GERAR CONTRATO ] */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleOpenExclusividadeGenerator}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-heading font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-slate-800 active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>GERAR CONTRATO</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-ABA: HISTÓRICO CENTRAL DE CONTRATOS */}
      {activeSubTab === 'historico' && (
        <div className="space-y-5">
          {/* BUSCA E FILTRO */}
          <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={historicoSearch}
                onChange={(e) => setHistoricoSearch(e.target.value)}
                placeholder="Buscar contrato por cliente, imóvel, tipo ou código..."
                className="w-full pl-9 pr-4 py-2 rounded-xl windows-input text-xs sm:text-sm placeholder-slate-400 font-mono text-slate-900"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={historicoStatusFilter}
                onChange={(e) => setHistoricoStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl windows-input text-xs font-mono cursor-pointer font-bold text-slate-800"
              >
                <option value="all">Todos os Tipos e Status</option>
                <option value="exclusividade">Exclusividade</option>
                <option value="a_vista">À Vista</option>
                <option value="parcelado">Parcelado</option>
                <option value="assinado">Assinados</option>
              </select>
            </div>
          </div>

          {/* LISTA DO HISTÓRICO */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Contratos Emitidos no Sistema ({sales.length + modularContracts.length} registros)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Central Única de Auditoria & Downloads
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {/* Vendas / Contratos Cadastrados */}
              {sales.map((sale) => (
                <div key={sale.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-mono font-bold px-2 py-0.5 rounded">
                        VENDA #{sale.codigoVenda}
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        sale.financial.tipoPagamento === 'a_vista' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                      }`}>
                        {sale.financial.tipoPagamento === 'a_vista' ? 'À VISTA' : 'PARCELADO'}
                      </span>
                      {sale.signatures.isFullySigned ? (
                        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Assinado
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" /> Pendente de Assinatura
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                      {sale.buyer.nome} — Lote {sale.property.lote}, Q. {sale.property.quadra} ({sale.property.empreendimento})
                    </h4>
                    <p className="text-xs font-mono text-slate-500">
                      Data: {formatDateBR(sale.createdAt)} • Valor: <strong className="text-emerald-700">{formatCurrency(sale.financial.valorTotal)}</strong> • Corretor: {sale.seller.vendedorNome}
                    </p>
                  </div>

                  {/* AÇÕES: DOCX, PDF, PDF ASSINADO, VER DOCUMENTO */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenGenerator(undefined, sale, sale.financial.tipoPagamento === 'a_vista' ? 'a_vista' : 'parcelado')}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>[ BAIXAR DOCX ]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenGenerator(undefined, sale, sale.financial.tipoPagamento === 'a_vista' ? 'a_vista' : 'parcelado')}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span>[ BAIXAR PDF ]</span>
                    </button>

                    {sale.signatures.isFullySigned && (
                      <button
                        type="button"
                        onClick={() => onOpenGenerator(undefined, sale, sale.financial.tipoPagamento === 'a_vista' ? 'a_vista' : 'parcelado')}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-lg border border-slate-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>[ BAIXAR PDF ASSINADO ]</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Contratos Modulares de Exclusividade Salvos */}
              {modularContracts.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-900 text-white border border-slate-900 text-xs font-mono font-bold px-2 py-0.5 rounded">
                        EXCLUSIVIDADE
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {c.contractId}
                      </span>
                      {c.status === 'assinado' ? (
                        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Assinado
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" /> Aguardando Assinatura
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                      {c.contratanteNome} — {c.imovelDescricao || 'Imóvel sob Exclusividade'}
                    </h4>
                    <p className="text-xs font-mono text-slate-500">
                      Data: {formatDateBR(c.createdAt)} • Valor: <strong className="text-emerald-700">{formatCurrency(c.valorVenda || 0)}</strong> • Corretor: {c.corretorNome}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('exclusividade_modular')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>[ VER DOCUMENTO ]</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-ABA: GERENCIAR MODELOS WORD (.DOCX) */}
      {activeSubTab === 'modelos_docx' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-900">
                Biblioteca de Arquivos .docx
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Modelos de base para preenchimento automatizado de variáveis e tags do sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer border border-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Modelo .docx</span>
            </button>
          </div>

          {/* LISTAGEM DOS MODELOS .DOCX */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                      {tpl.tipoDocumento}
                    </span>
                    {tpl.isDefault && (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-sm">{tpl.nome}</h3>
                  <p className="text-xs font-mono text-slate-500 truncate">{tpl.fileName}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenGenerator(tpl)}
                    className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-lg border border-blue-200 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>Usar Modelo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditTemplate(tpl)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                    title="Editar Informações"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateTemplate(tpl)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {!tpl.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.nome)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE MODELO .DOCX */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-700 border border-blue-300 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-slate-900 text-base">
                    {editingTemplateId ? 'Editar Modelo .docx' : 'Cadastrar Novo Modelo .docx'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Configuração de tags e mapeamentos automáticos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Nome do Modelo:</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Contrato de Compra e Venda à Vista"
                  className="w-full px-3 py-2 rounded-xl windows-input text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Tipo de Documento:</label>
                <select
                  value={formData.tipoDocumento}
                  onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl windows-input text-xs font-semibold text-slate-900 cursor-pointer"
                >
                  <option value="recibo_quitacao">Recibo de Quitação / Venda à Vista</option>
                  <option value="compromisso_parcelado">Compromisso de Compra e Venda Parcelado</option>
                  <option value="corretagem_exclusividade">Corretagem e Exclusividade</option>
                  <option value="outro">Outro Modelo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Arquivo .docx:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="w-full text-xs font-mono text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {formData.fileName && (
                  <p className="text-[11px] font-mono text-emerald-700 mt-1">
                    Arquivo carregado: <strong>{formData.fileName}</strong>
                  </p>
                )}
                {uploadError && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1">{uploadError}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer border border-blue-600"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
