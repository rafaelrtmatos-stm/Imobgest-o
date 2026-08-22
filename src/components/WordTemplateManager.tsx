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
  Settings
} from 'lucide-react';
import { DocumentFieldMapping, DocumentTemplate, SaleRecord, TipoModeloDocumento } from '../types';
import { 
  SYSTEM_FIELDS_CATALOG, 
  parseUploadedDocxFile, 
  SystemFieldDefinition, 
  findSystemFieldByTag,
  normalizeTag 
} from '../utils/docxProcessor';

interface WordTemplateManagerProps {
  templates: DocumentTemplate[];
  onSaveTemplates: (templates: DocumentTemplate[]) => void;
  sales?: SaleRecord[];
  onOpenGenerator: (template?: DocumentTemplate, sale?: SaleRecord) => void;
  isSettingsMode?: boolean;
  onNavigateToSettings?: () => void;
}

export const WordTemplateManager: React.FC<WordTemplateManagerProps> = ({
  templates,
  onSaveTemplates,
  sales = [],
  onOpenGenerator,
  isSettingsMode = false,
  onNavigateToSettings,
}) => {
  // Filtros de listagem
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados do Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: Envio, 2: Reconhecimento, 3: Pré-visualização

  // Formulário do Wizard
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

  // Abrir modal de novo modelo
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
    setWizardStep(2); // vai direto para o reconhecimento/revisão
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
        fileName: parsed.fileName,
        fileBase64: parsed.fileBase64,
        rawText: parsed.rawText,
        contentHtml: parsed.contentHtml,
        tags: parsed.tags,
        nome: prev.nome || parsed.fileName.replace(/\.docx$/i, '').replace(/_/g, ' '),
      }));

      // Avança para o Passo 2 (Tela de Reconhecimento)
      setWizardStep(2);
    } catch (err: any) {
      console.error('Erro ao analisar arquivo .docx:', err);
      setUploadError('Não foi possível ler o arquivo .docx. Verifique se o arquivo não está corrompido ou protegido com senha.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Substituir arquivo de um modelo existente
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingTemplateId) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Selecione um arquivo .docx válido.');
      return;
    }

    try {
      const parsed = await parseUploadedDocxFile(file);
      const updated = templates.map(tpl => {
        if (tpl.id === replacingTemplateId) {
          return {
            ...tpl,
            fileName: parsed.fileName,
            fileBase64: parsed.fileBase64,
            rawText: parsed.rawText,
            contentHtml: parsed.contentHtml,
            tags: parsed.tags,
            updatedAt: new Date().toISOString(),
          };
        }
        return tpl;
      });
      onSaveTemplates(updated);
      alert('Arquivo do modelo substituído com sucesso!');
    } catch (err) {
      console.error('Erro ao substituir arquivo:', err);
      alert('Erro ao processar o novo arquivo .docx.');
    } finally {
      setReplacingTemplateId(null);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    }
  };

  // Atualizar mapeamento de um campo na tabela do Passo 2
  const handleMapField = (rawTag: string, systemFieldId: string) => {
    const systemField = SYSTEM_FIELDS_CATALOG.find(f => f.id === systemFieldId);

    setFormData(prev => {
      const newTags = prev.tags.map(tag => {
        if (tag.rawTag === rawTag) {
          return {
            ...tag,
            systemFieldId,
            systemFieldLabel: systemField ? systemField.label : 'Não mapeado',
            status: systemField ? ('reconhecido' as const) : ('nao_reconhecido' as const),
          };
        }
        return tag;
      });

      const newCustomMappings = {
        ...prev.customMappings,
        [rawTag]: systemFieldId,
      };

      return {
        ...prev,
        tags: newTags,
        customMappings: newCustomMappings,
      };
    });
  };

  // Salvar mapeamento customizado via modal [CADASTRAR CAMPO]
  const handleSaveCustomFieldMapping = () => {
    const { rawTag, selectedSystemFieldId, customValue } = customFieldModal;
    const systemField = SYSTEM_FIELDS_CATALOG.find(f => f.id === selectedSystemFieldId);

    setFormData(prev => {
      const newTags = prev.tags.map(tag => {
        if (tag.rawTag === rawTag) {
          return {
            ...tag,
            systemFieldId: selectedSystemFieldId,
            systemFieldLabel: systemField ? systemField.label : 'Valor Fixo / Personalizado',
            status: 'reconhecido' as const,
            customDefaultValue: customValue,
          };
        }
        return tag;
      });

      const newCustomMappings = {
        ...prev.customMappings,
        [rawTag]: selectedSystemFieldId || customValue,
      };

      return {
        ...prev,
        tags: newTags,
        customMappings: newCustomMappings,
      };
    });

    setCustomFieldModal({
      isOpen: false,
      rawTag: '',
      cleanTag: '',
      selectedSystemFieldId: '',
      customValue: '',
    });
  };

  // Salvar modelo no array e persistir
  const handleSaveTemplate = () => {
    if (!formData.nome.trim()) {
      alert('Por favor, informe o nome do modelo.');
      return;
    }

    if (!formData.rawText && !formData.contentHtml) {
      alert('O modelo deve conter o conteúdo do arquivo Word.');
      return;
    }

    const templateToSave: DocumentTemplate = {
      id: editingTemplateId || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nome: formData.nome.trim(),
      tipoDocumento: formData.tipoDocumento,
      descricao: formData.descricao.trim(),
      fileName: formData.fileName || 'DOCUMENTO_WORD.docx',
      fileBase64: formData.fileBase64,
      rawText: formData.rawText,
      contentHtml: formData.contentHtml,
      tags: formData.tags,
      customMappings: formData.customMappings,
      isDefault: false,
      createdAt: editingTemplateId 
        ? (templates.find(t => t.id === editingTemplateId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedTemplates: DocumentTemplate[];
    if (editingTemplateId) {
      updatedTemplates = templates.map(t => t.id === editingTemplateId ? templateToSave : t);
    } else {
      updatedTemplates = [templateToSave, ...templates];
    }

    onSaveTemplates(updatedTemplates);
    setIsModalOpen(false);
  };

  // Filtragem dos modelos na tela
  const filteredTemplates = templates.filter(tpl => {
    const matchType = filterTipo === 'all' || tpl.tipoDocumento === filterTipo;
    const matchSearch = tpl.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tpl.descricao && tpl.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tpl.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const getTipoLabel = (tipo: TipoModeloDocumento) => {
    switch (tipo) {
      case 'recibo_quitacao':
      case 'venda_a_vista':
      case 'recibo':
      case 'terreno_a_vista':
        return 'Recibo de Quitação (À Vista)';
      case 'compromisso_parcelado':
      case 'venda_parcelada':
      case 'terreno_parcelado':
        return 'Compromisso de Compra e Venda';
      case 'exclusividade_casas':
      case 'contrato':
      case 'corretagem_exclusividade':
        return 'Contrato de Exclusividade';
      default:
        return 'Modelo';
    }
  };

  const getTipoBadgeColor = (tipo: TipoModeloDocumento) => {
    switch (tipo) {
      case 'recibo_quitacao':
      case 'venda_a_vista':
      case 'recibo':
      case 'terreno_a_vista':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'compromisso_parcelado':
      case 'venda_parcelada':
      case 'terreno_parcelado':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'exclusividade_casas':
      case 'contrato':
      case 'corretagem_exclusividade':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Input invisível para substituição rápida de arquivo */}
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileChange}
        accept=".docx"
        className="hidden"
      />

      {/* Top Banner & Ações */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isSettingsMode ? 'Gerenciador de Modelos Word (.docx)' : 'Modelos de Contratos e Recibos'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSettingsMode 
                  ? 'Cadastre novos modelos Word (.docx), reconheça tags e mapeie variáveis do sistema para geração automática de contratos.'
                  : 'Selecione um modelo oficial (Recibo de Quitação, Compromisso de Compra e Venda ou Contrato de Exclusividade) para preenchimento imediato.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Adicionar Modelo (Visível SOMENTE em Configurações) */}
        {isSettingsMode && (
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADICIONAR MODELO DE DOCUMENTO</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos os Modelos' },
            { id: 'recibo_quitacao', label: 'Recibo de Quitação (À Vista)' },
            { id: 'compromisso_parcelado', label: 'Compromisso de Compra e Venda' },
            { id: 'exclusividade_casas', label: 'Contrato de Exclusividade' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTipo(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterTipo === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar modelo ou arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid de Modelos Salvos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map(tpl => {
          const recognizedCount = tpl.tags.filter(t => t.status === 'reconhecido').length;
          const totalTags = tpl.tags.length;

          return (
            <div 
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getTipoBadgeColor(tpl.tipoDocumento)}`}>
                    {getTipoLabel(tpl.tipoDocumento)}
                  </span>

                  {tpl.isDefault && (
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Padrão de Fábrica
                    </span>
                  )}
                </div>

                {/* Título & Arquivo */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
                      {tpl.nome}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-600 mt-0.5 flex items-center">
                      <span className="truncate max-w-[180px]">{tpl.fileName}</span>
                    </p>
                  </div>
                </div>

                {tpl.descricao && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {tpl.descricao}
                  </p>
                )}

                {/* Status das Variáveis */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-4 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-600">Variáveis Mapeadas:</span>
                  <span className="font-bold text-emerald-700 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {recognizedCount} de {totalTags} campos
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Modelo */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                {/* Botão Gerar Documento */}
                <button
                  type="button"
                  onClick={() => onOpenGenerator(tpl)}
                  className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Gerar Documento com este Modelo</span>
                </button>

                {/* Ações secundárias */}
                {isSettingsMode ? (
                  /* Painel Completo de Gerenciamento em Configurações */
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    <button
                      type="button"
                      title="Visualizar Modelo"
                      onClick={() => setViewingTemplate(tpl)}
                      className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Editar Informações e Mapeamentos"
                      onClick={() => handleEditTemplate(tpl)}
                      className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Duplicar Modelo"
                      onClick={() => handleDuplicateTemplate(tpl)}
                      className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Substituir Arquivo .docx"
                      onClick={() => {
                        setReplacingTemplateId(tpl.id);
                        if (replaceFileInputRef.current) {
                          replaceFileInputRef.current.click();
                        }
                      }}
                      className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Excluir Modelo"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.nome)}
                      className="flex items-center justify-center p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Visualização simples na aba de Contratos */
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setViewingTemplate(tpl)}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium cursor-pointer transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Pré-visualizar Modelo e Variáveis</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Clique no botão acima para adicionar um novo modelo de documento Word (.docx) à sua biblioteca.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINCIPAL: CADASTRO / EDIÇÃO DO MODELO WORD COM WIZARD DE 3 PASSOS */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
            
            {/* Header do Wizard */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{editingTemplateId ? 'Editar Modelo de Documento' : 'Cadastro do Modelo Word (.docx)'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {wizardStep === 1 && 'Passo 1 de 3: Identificação e Envio do Arquivo'}
                  {wizardStep === 2 && 'Passo 2 de 3: Reconhecimento e Mapeamento de Campos'}
                  {wizardStep === 3 && 'Passo 3 de 3: Pré-visualização e Confirmação'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Visual */}
            <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0">
              <div className={`flex items-center space-x-2 ${wizardStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  1
                </div>
                <span>Envio do Word</span>
              </div>
              <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
              <div className={`flex items-center space-x-2 ${wizardStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  2
                </div>
                <span>Reconhecimento de Campos</span>
              </div>
              <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
              <div className={`flex items-center space-x-2 ${wizardStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  3
                </div>
                <span>Pré-visualização</span>
              </div>
            </div>

            {/* Conteúdo Dinâmico do Wizard com Scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* ========================================================= */}
              {/* PASSO 1: DADOS BÁSICOS E ENVIO DO ARQUIVO .DOCX           */}
              {/* ========================================================= */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nome do Modelo */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Nome do modelo: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Recibo de Quitação — Venda à Vista"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    {/* Tipo de Documento */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Tipo de documento: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.tipoDocumento}
                        onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value as TipoModeloDocumento })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="recibo_quitacao">Recibo de Quitação (À Vista)</option>
                        <option value="compromisso_parcelado">Compromisso de Compra e Venda (Parcelada)</option>
                        <option value="exclusividade_casas">Contrato de Exclusividade (Venda de Casas)</option>
                        <option value="outro">Outro Modelo</option>
                      </select>
                    </div>
                  </div>

                  {/* Descrição Opcional */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Descrição ou Observações (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Contrato padrão utilizado para lotes com parcelamento direto em até 120x"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Área de Seleção do Arquivo Word */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Arquivo do modelo (.docx): <span className="text-rose-500">*</span>
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".docx"
                      className="hidden"
                    />

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center space-x-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>[ SELECIONAR ARQUIVO WORD ]</span>
                        </button>
                        <p className="text-xs text-slate-500 mt-2">
                          Aceitar: <span className="font-bold text-slate-700 font-mono">.docx</span> (Microsoft Word)
                        </p>
                      </div>

                      {formData.fileName && (
                        <div className="bg-white border border-emerald-300 rounded-xl px-4 py-2 flex items-center space-x-2 text-xs font-mono font-bold text-emerald-800 shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Arquivo carregado: {formData.fileName}</span>
                        </div>
                      )}
                    </div>

                    {uploadError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>

                  {/* Orientações sobre variáveis no Word */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Como preparar o documento no Microsoft Word</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      O sistema reconhece tanto o novo padrão recomendado quanto o padrão antigo já utilizado nos seus contratos existentes:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <span className="font-bold text-blue-700 block mb-1">Novo padrão recomendado:</span>
                        <code className="text-[11px] font-mono text-slate-700 block">
                          {'{vendedor}'}, {'{cpf}'}, {'{valor_total}'}, {'{valor_total_extenso}'}, {'{lote}'}, {'{quadra}'}, {'{empreendimento}'}, {'{data_contrato}'}
                        </code>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <span className="font-bold text-emerald-700 block mb-1">Padrão existente aceito:</span>
                        <code className="text-[11px] font-mono text-slate-700 block">
                          [VENDEDOR], [CPF], [VALOR_TOTAL], [VALOR_TOTAL_EXTENSO], [LOTE], [QUADRA], [ENTRADA], [RESTANTE], [QUANTIDADEPARCELAS]
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASSO 2: TELA DE RECONHECIMENTO DE CAMPOS                  */}
              {/* ========================================================= */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">
                        Campos encontrados no documento Word
                      </h4>
                      <p className="text-xs text-blue-800 mt-0.5">
                        O sistema analisou o seu contrato e identificou as variáveis abaixo. Caso algum campo não tenha sido reconhecido automaticamente, você pode cadastrá-lo ou mapeá-lo manualmente.
                      </p>
                    </div>
                  </div>

                  {/* Tabela de Campos Encontrados */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Campo encontrado</th>
                          <th className="py-2.5 px-4">Campo do sistema</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.tags.map((tag, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {tag.rawTag}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <select
                                value={tag.systemFieldId}
                                onChange={(e) => handleMapField(tag.rawTag, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">-- Selecione o campo correspondente --</option>
                                {SYSTEM_FIELDS_CATALOG.map(f => (
                                  <option key={f.id} value={f.id}>
                                    [{f.category}] {f.label} ({f.exampleValue})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-4">
                              {tag.status === 'reconhecido' && tag.systemFieldId ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 mr-1" /> Reconhecido
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <AlertCircle className="w-3 h-3 mr-1" /> Campo não reconhecido
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {tag.status !== 'reconhecido' || !tag.systemFieldId ? (
                                <button
                                  type="button"
                                  onClick={() => setCustomFieldModal({
                                    isOpen: true,
                                    rawTag: tag.rawTag,
                                    cleanTag: tag.cleanTag,
                                    selectedSystemFieldId: '',
                                    customValue: '',
                                  })}
                                  className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                                >
                                  [CADASTRAR CAMPO]
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-600 font-mono">
                                  {tag.systemFieldLabel}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {formData.tags.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              Nenhuma variável <code className="font-mono">[CAMPO]</code> ou <code className="font-mono">{'{campo}'}</code> foi identificada no arquivo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PASSO 3: PRÉ-VISUALIZAÇÃO DO DOCUMENTO                     */}
              {/* ========================================================= */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Pré-visualização do Modelo: {formData.nome}
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Confira se os campos foram identificados corretamente antes de salvar o modelo.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-white text-emerald-800 px-3 py-1 rounded-lg border border-emerald-300">
                      {formData.tags.filter(t => t.status === 'reconhecido').length} Campos Prontos
                    </span>
                  </div>

                  {/* Documento Renderizado em Folha A4 */}
                  <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 overflow-x-auto">
                    <div 
                      className="bg-white shadow-md rounded-lg p-8 mx-auto max-w-2xl min-h-[500px] text-slate-900"
                      dangerouslySetInnerHTML={{ 
                        __html: formData.contentHtml || `<pre className="whitespace-pre-wrap font-sans text-xs">${formData.rawText}</pre>` 
                      }} 
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer do Modal com Botões de Navegação */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>[VOLTAR]</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center space-x-2">
                {wizardStep === 1 && (
                  <button
                    type="button"
                    disabled={!formData.fileName && !formData.rawText}
                    onClick={() => {
                      if (!formData.nome.trim()) {
                        alert('Informe o nome do modelo.');
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white cursor-pointer shadow-xs"
                  >
                    <span>Avançar para Reconhecimento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {wizardStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  >
                    <span>Avançar para Pré-visualização</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {wizardStep === 3 && (
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="flex items-center space-x-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>[SALVAR MODELO]</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL [CADASTRAR CAMPO] PARA CAMPOS NÃO RECONHECIDOS      */}
      {/* ========================================================= */}
      {customFieldModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Cadastrar Campo Desconhecido</span>
              </h3>
              <button
                type="button"
                onClick={() => setCustomFieldModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Informe qual dado do sistema corresponde à variável <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{customFieldModal.rawTag}</strong> encontrada no seu Word:
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Associar a um Campo do Sistema Imobiliário:
                </label>
                <select
                  value={customFieldModal.selectedSystemFieldId}
                  onChange={(e) => setCustomFieldModal(prev => ({ ...prev, selectedSystemFieldId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Escolha a variável do sistema --</option>
                  {SYSTEM_FIELDS_CATALOG.map(field => (
                    <option key={field.id} value={field.id}>
                      [{field.category}] {field.label} ({field.exampleValue})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] text-slate-600 uppercase font-bold">OU valor fixo</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Preencher com Texto / Valor Personalizado Fixo:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1º Ofício de Notas e Protestos"
                  value={customFieldModal.customValue}
                  onChange={(e) => setCustomFieldModal(prev => ({ ...prev, customValue: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomFieldModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!customFieldModal.selectedSystemFieldId && !customFieldModal.customValue}
                onClick={handleSaveCustomFieldMapping}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Salvar Mapeamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE VISUALIZAÇÃO RÁPIDA DE MODELO                    */}
      {/* ========================================================= */}
      {viewingTemplate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{viewingTemplate.nome}</h3>
                <p className="text-xs text-slate-500">{viewingTemplate.fileName} • {getTipoLabel(viewingTemplate.tipoDocumento)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTemplate(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div 
                className="bg-white p-6 rounded-lg shadow-xs"
                dangerouslySetInnerHTML={{ 
                  __html: viewingTemplate.contentHtml || `<pre className="whitespace-pre-wrap font-sans text-xs">${viewingTemplate.rawText}</pre>` 
                }} 
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                {viewingTemplate.tags.length} variáveis identificadas
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = viewingTemplate;
                    setViewingTemplate(null);
                    onOpenGenerator(t);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Gerar Documento com este Modelo
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTemplate(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
