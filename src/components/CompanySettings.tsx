import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  Check, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Sparkles,
  Info,
  RefreshCw,
  FolderKanban,
  FileCode2
} from 'lucide-react';
import { CompanyConfig, DocumentTemplate, SaleRecord } from '../types';
import { maskCNPJ, maskPhone } from '../utils/formatters';
import { WordTemplateManager } from './WordTemplateManager';

interface CompanySettingsProps {
  config: CompanyConfig;
  onSaveConfig: (updatedConfig: CompanyConfig) => void;
  templates: DocumentTemplate[];
  onSaveTemplates: (templates: DocumentTemplate[]) => void;
  onOpenGenerator: (template?: DocumentTemplate, sale?: SaleRecord) => void;
  sales?: SaleRecord[];
  activeSubTab?: 'empresa' | 'modelos';
  onChangeSubTab?: (tab: 'empresa' | 'modelos') => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  config,
  onSaveConfig,
  templates,
  onSaveTemplates,
  onOpenGenerator,
  sales = [],
  activeSubTab = 'empresa',
  onChangeSubTab,
}) => {
  const [internalTab, setInternalTab] = useState<'empresa' | 'modelos'>(activeSubTab);
  const currentTab = onChangeSubTab ? activeSubTab : internalTab;

  const handleTabChange = (tab: 'empresa' | 'modelos') => {
    if (onChangeSubTab) {
      onChangeSubTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [formData, setFormData] = useState<CompanyConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* NAVEGAÇÃO DE SUB-ABAS EM CONFIGURAÇÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="tab-settings-empresa"
            onClick={() => handleTabChange('empresa')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'empresa'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Dados da Empresa</span>
          </button>

          <button
            type="button"
            id="tab-settings-modelos"
            onClick={() => handleTabChange('modelos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'modelos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Modelos de Documentos (.docx)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'modelos' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {templates.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden md:flex items-center space-x-1 font-medium pr-2">
          <span>Configurações globais de contratos e dados institucionais</span>
        </div>
      </div>

      {/* ABA 1: DADOS DA EMPRESA */}
      {currentTab === 'empresa' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 font-heading">Identificação da Empresa</h1>
              </div>
              <p className="text-sm text-slate-500">
                Estes dados são injetados automaticamente como tags padrão nos contratos Word (<code className="text-slate-700 font-mono">{'{nome_contratado}'}</code>, <code className="text-slate-700 font-mono">{'{creci_contratado}'}</code>, etc.).
              </p>
            </div>

            {savedSuccess && (
              <div className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold animate-fade-in">
                <Check className="w-4 h-4" />
                <span>Configurações salvas com sucesso!</span>
              </div>
            )}
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
            {/* SEÇÃO 1: IDENTIFICAÇÃO JURÍDICA */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Identificação da Empresa / Vendedora
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Empresa / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomeEmpresa}
                    onChange={e => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                    placeholder="Ex: ImobGestão Empreendimentos Imobiliários Ltda"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{nome_contratado}'}, [VENDEDOR]</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ ou CPF da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpfCnpj}
                    onChange={e => setFormData({ ...formData, cpfCnpj: maskCNPJ(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{cpf_cnpj_contratado}'}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registro no CRECI *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creci}
                    onChange={e => setFormData({ ...formData, creci: e.target.value })}
                    placeholder="Ex: CRECI-PA 4810-J"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{creci_contratado}'}, [CRECI]</span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: CONTATO & ENDEREÇO COMERCIAL */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Endereço Comercial & Contatos
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço Comercial Completo
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Ex: Av. Mendonça Furtado, nº 1.450, Centro"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{endereco_contratado}'}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade da Empresa</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Ex: Santarém"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.estado}
                    onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    placeholder="PA"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                    placeholder="(00) 0000-0000"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{telefones_contratado}'}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Comercial</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@imobgestao.com.br"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: PADRÕES PARA ASSINATURA DE CONTRATOS */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Local Padrão de Assinatura nos Contratos
                </h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 mb-2">
                <p className="font-semibold text-slate-800 flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Como funciona no documento Word:</span>
                </p>
                <p>
                  Ao gerar um contrato, a data e local serão formatados automaticamente como: 
                  <span className="font-mono text-purple-700 ml-1 font-semibold">
                    "{formData.cidadeAssinatura || 'Santarém'}({formData.estadoAssinatura || 'PA'}), 21 de agosto de 2026"
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade Padrão de Assinatura
                  </label>
                  <input
                    type="text"
                    value={formData.cidadeAssinatura}
                    onChange={e => setFormData({ ...formData, cidadeAssinatura: e.target.value })}
                    placeholder="Ex: Santarém"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{cidade_assinatura}'}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado (UF) de Assinatura
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.estadoAssinatura}
                    onChange={e => setFormData({ ...formData, estadoAssinatura: e.target.value.toUpperCase() })}
                    placeholder="PA"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 uppercase"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Substitui: {'{estado_assinatura}'}</span>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
              <button
                id="btn-save-company-config"
                type="submit"
                className="flex items-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Salvar Configurações da Empresa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 2: MODELOS DE DOCUMENTOS (.DOCX) - COM O BOTÃO + ADICIONAR MODELO DE DOCUMENTO */}
      {currentTab === 'modelos' && (
        <div className="space-y-6">
          <WordTemplateManager
            templates={templates}
            onSaveTemplates={onSaveTemplates}
            sales={sales}
            onOpenGenerator={onOpenGenerator}
            isSettingsMode={true}
          />
        </div>
      )}
    </div>
  );
};
