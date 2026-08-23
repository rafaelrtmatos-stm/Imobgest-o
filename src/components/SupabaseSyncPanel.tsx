import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  KeyRound, 
  Layers, 
  Server, 
  ArrowRight,
  Sparkles,
  Zap,
  HardDrive
} from 'lucide-react';
import { 
  AppUser, 
  Cliente, 
  CompanyConfig, 
  Corretor, 
  DocumentTemplate, 
  Empreendimento, 
  SaleRecord 
} from '../types';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  syncAllToSupabase, 
  syncAllFromSupabase, 
  getSupabaseSqlSchema,
  getLastSyncTime,
  SupabaseConfig
} from '../utils/supabaseClient';

interface SupabaseSyncPanelProps {
  sales: SaleRecord[];
  clientes: Cliente[];
  empreendimentos: Empreendimento[];
  corretores: Corretor[];
  wordTemplates: DocumentTemplate[];
  companyConfig: CompanyConfig;
  users: AppUser[];
  onDataImported?: (data: {
    sales?: SaleRecord[];
    clientes?: Cliente[];
    empreendimentos?: Empreendimento[];
    corretores?: Corretor[];
    wordTemplates?: DocumentTemplate[];
    companyConfig?: CompanyConfig;
    users?: AppUser[];
  }) => void;
}

export const SupabaseSyncPanel: React.FC<SupabaseSyncPanelProps> = ({
  sales,
  clientes,
  empreendimentos,
  corretores,
  wordTemplates,
  companyConfig,
  users,
  onDataImported,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(config.url);
  const [tempKey, setTempKey] = useState(config.anonKey);
  const [tempAutoSync, setTempAutoSync] = useState(config.autoSync);

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncTime());

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Testa a conexão ao carregar
  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus('checking');
    setStatusMessage('Testando conexão com o servidor Supabase...');
    setSyncFeedback(null);

    const res = await testSupabaseConnection();
    if (res.success) {
      setConnectionStatus('connected');
      setStatusMessage(res.message);
    } else {
      setConnectionStatus('error');
      setStatusMessage(res.message);
    }
  };

  const handleSaveConfig = () => {
    const newConfig: SupabaseConfig = {
      url: tempUrl.trim(),
      anonKey: tempKey.trim(),
      autoSync: tempAutoSync,
    };
    saveStoredSupabaseConfig(newConfig);
    setConfig(newConfig);
    setIsEditingConfig(false);
    handleTestConnection();
  };

  const handleUploadToCloud = async () => {
    setIsUploading(true);
    setSyncFeedback(null);

    const res = await syncAllToSupabase({
      sales,
      clientes,
      empreendimentos,
      corretores,
      wordTemplates,
      companyConfig,
      users,
    });

    setIsUploading(false);
    if (res.success) {
      setSyncFeedback({ type: 'success', text: res.message });
      setLastSync(getLastSyncTime());
      setConnectionStatus('connected');
    } else {
      setSyncFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!window.confirm('Tem certeza que deseja baixar os dados da nuvem? Os dados locais serão atualizados com os dados salvos no Supabase.')) {
      return;
    }

    setIsDownloading(true);
    setSyncFeedback(null);

    const res = await syncAllFromSupabase();
    setIsDownloading(false);

    if (res.success && res.data) {
      setSyncFeedback({ type: 'success', text: res.message });
      setLastSync(getLastSyncTime());
      if (onDataImported) {
        onDataImported(res.data);
      }
    } else {
      setSyncFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCopySql = () => {
    const sql = getSupabaseSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* HEADER DO PAINEL SUPABASE */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-extrabold tracking-tight font-heading">
                  Banco de Dados em Nuvem Supabase
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  PostgreSQL
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Sincronize vendas, clientes, contratos, modelos Word e dados em tempo real no seu próprio projeto Supabase.
              </p>
            </div>
          </div>

          {/* STATUS PILL */}
          <div className="flex items-center space-x-2 shrink-0">
            {connectionStatus === 'checking' && (
              <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Testando Conexão...</span>
              </div>
            )}
            {connectionStatus === 'connected' && (
              <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Conectado à Nuvem</span>
              </div>
            )}
            {connectionStatus === 'error' && (
              <div className="flex items-center space-x-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-3.5 py-2 rounded-xl text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Aviso de Conexão</span>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center space-x-1.5">
              <span className="text-emerald-400 font-bold">●</span>
              <span>{statusMessage}</span>
            </span>
            {lastSync && (
              <span className="text-slate-400 hidden sm:inline">
                Última sincronização: <strong>{lastSync}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL DO PAINEL */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* FEEDBACK DE SINCRONIZAÇÃO */}
        {syncFeedback && (
          <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            syncFeedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <div className="flex items-center space-x-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{syncFeedback.text}</span>
            </div>
            <button 
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* CARDS DE AÇÕES RÁPIDAS DE SINCRONIZAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. ENVIAR PARA NUVEM */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Backup Nuvem
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Salvar Dados no Supabase
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Envia todas as {sales.length} vendas, {clientes.length} clientes, {empreendimentos.length} empreendimentos e modelos Word para o banco Supabase.
              </p>
            </div>

            <button
              type="button"
              id="btn-sync-to-supabase"
              onClick={handleUploadToCloud}
              disabled={isUploading}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando na Nuvem...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Sincronizar Agora (Upload)</span>
                </>
              )}
            </button>
          </div>

          {/* 2. BAIXAR DA NUVEM */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                  Download Nuvem
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Restaurar do Supabase
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Puxa todas as tabelas e registros gravados no seu Supabase para o seu navegador atual.
              </p>
            </div>

            <button
              type="button"
              id="btn-sync-from-supabase"
              onClick={handleDownloadFromCloud}
              disabled={isDownloading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Baixando Dados...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Restaurar da Nuvem</span>
                </>
              )}
            </button>
          </div>

          {/* 3. SCRIPT SQL DAS TABELAS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-slate-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center font-bold">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md">
                  Estrutura SQL
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Tabelas e Schema SQL
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Copie o script SQL pronto com 7 tabelas e permissões para colar no <strong>SQL Editor</strong> do Supabase.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="btn-copy-supabase-sql"
                onClick={handleCopySql}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-view-supabase-sql"
                onClick={() => setShowSqlModal(true)}
                className="p-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                title="Ver Script SQL Completo"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* DETALHES DAS CREDENCIAIS DO SUPABASE */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-slate-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Credenciais do Projeto Supabase
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isEditingConfig) {
                  setTempUrl(config.url);
                  setTempKey(config.anonKey);
                  setTempAutoSync(config.autoSync);
                }
                setIsEditingConfig(!isEditingConfig);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
            >
              {isEditingConfig ? 'Cancelar' : 'Alterar Credenciais'}
            </button>
          </div>

          {isEditingConfig ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://sua-url.supabase.co"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Anon / Public Key
                </label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="sb_publishable_... ou eyJhb..."
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={tempAutoSync}
                    onChange={(e) => setTempAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Sincronizar alterações automaticamente em segundo plano</span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Salvar e Reconectar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Project URL
                </span>
                <span className="font-mono text-slate-800 truncate block font-semibold">
                  {config.url || 'Não configurado'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Anon Public Key
                </span>
                <span className="font-mono text-slate-800 block font-semibold">
                  {config.anonKey ? `${config.anonKey.substring(0, 16)}••••••••` : 'Não configurado'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* GUIA PASSO A PASSO PARA O SUPABASE SQL EDITOR */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5">
          <h4 className="text-xs font-bold text-emerald-900 flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Passo a Passo: Como inicializar as tabelas no Supabase</span>
          </h4>
          <ol className="list-decimal list-inside text-xs text-emerald-800 space-y-1.5 ml-1">
            <li>Acesse seu painel no Supabase: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="font-bold underline">supabase.com/dashboard</a>.</li>
            <li>No menu lateral esquerdo do Supabase, clique em <strong>"SQL Editor"</strong>.</li>
            <li>Clique no botão <strong>"Copiar SQL"</strong> acima e cole no editor do Supabase.</li>
            <li>Clique no botão verde <strong>"Run"</strong> (Executar) no Supabase.</li>
            <li>Pronto! Todas as 7 tabelas com suporte a JSON e consultas rápidas estarão criadas e prontas para sincronização imediata.</li>
          </ol>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DO SCRIPT SQL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base font-heading">Script SQL de Criação das Tabelas Supabase</h3>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-slate-950 flex-1 font-mono text-xs text-emerald-300">
              <pre className="whitespace-pre-wrap select-all">
                {getSupabaseSqlSchema()}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Execute este script no SQL Editor do Supabase para criar as tabelas.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
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
