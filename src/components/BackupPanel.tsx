import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CloudUpload, CloudDownload, Cloud } from 'lucide-react';
import { Cliente, Contrato, Venda } from '../types';
import {
  clearAllSupabaseData,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  syncAllFromSupabase,
  syncAllToSupabase,
  testSupabaseConnection,
} from '../utils/supabaseClient';
import { clearAllStoredData } from '../utils/storage';

interface BackupPanelProps {
  clientes: Cliente[];
  contratos: Contrato[];
  vendas: Venda[];
  onImport: (data: { clientes: Cliente[]; contratos: Contrato[]; vendas: Venda[] }) => void;
  onClearAll: () => void;
}

export function BackupPanel({ clientes, contratos, vendas, onImport, onClearAll }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [supaConfig, setSupaConfig] = useState(getStoredSupabaseConfig());
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), clientes, contratos, vendas };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imobgestao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        onImport({
          clientes: parsed.clientes || [],
          contratos: parsed.contratos || [],
          vendas: parsed.vendas || [],
        });
        setMessage('Backup importado com sucesso!');
      } catch {
        setMessage('Erro: arquivo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveSupabaseConfig = () => {
    saveStoredSupabaseConfig(supaConfig);
    setMessage('Configuração da nuvem salva.');
  };

  const handleTestConnection = async () => {
    setBusy(true);
    const res = await testSupabaseConnection();
    setMessage(res.message);
    setBusy(false);
  };

  const handleSyncUp = async () => {
    setBusy(true);
    const res = await syncAllToSupabase({ clientes, contratos, vendas });
    setMessage(res.message);
    setBusy(false);
  };

  const handleSyncDown = async () => {
    setBusy(true);
    const res = await syncAllFromSupabase();
    if (res.success && res.data) {
      onImport({
        clientes: res.data.clientes || clientes,
        contratos: res.data.contratos || contratos,
        vendas: res.data.vendas || vendas,
      });
    }
    setMessage(res.message);
    setBusy(false);
  };

  const handleConfirmClear = async () => {
    if (confirmText !== 'ZERAR') return;
    setBusy(true);
    clearAllStoredData();
    await clearAllSupabaseData();
    onClearAll();
    setBusy(false);
    setConfirmStep(0);
    setConfirmText('');
    setMessage('Todas as informações foram removidas.');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Backup & Dados</h1>
        <p className="text-sm text-slate-500">Exporte, importe e sincronize seus dados. Zere tudo com segurança se necessário.</p>
      </div>

      {message && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-sm rounded-xl p-3">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-heading font-bold text-slate-900">Exportar / Importar (Arquivo Local)</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl cursor-pointer">
            <Download className="w-4 h-4" /> Exportar Backup (.json)
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl cursor-pointer">
            <Upload className="w-4 h-4" /> Importar Backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
        <p className="text-xs text-slate-400">{clientes.length} clientes · {contratos.length} contratos · {vendas.length} vendas</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading font-bold text-slate-900">Sincronização com a Nuvem (Supabase)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Supabase URL" value={supaConfig.url}
            onChange={e => setSupaConfig({ ...supaConfig, url: e.target.value })} />
          <input className="input" placeholder="Supabase Anon Key" value={supaConfig.anonKey}
            onChange={e => setSupaConfig({ ...supaConfig, anonKey: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSaveSupabaseConfig} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
            Salvar Config
          </button>
          <button disabled={busy} onClick={handleTestConnection} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50">
            Testar Conexão
          </button>
          <button disabled={busy} onClick={handleSyncUp} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer disabled:opacity-50">
            <CloudUpload className="w-4 h-4" /> Enviar para Nuvem
          </button>
          <button disabled={busy} onClick={handleSyncDown} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer disabled:opacity-50">
            <CloudDownload className="w-4 h-4" /> Baixar da Nuvem
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="font-heading font-bold text-red-700">Zerar Informações</h2>
        </div>
        <p className="text-sm text-slate-600">
          Esta ação apaga permanentemente todos os clientes, contratos e vendas (local e nuvem).
          <strong> Recomendamos fortemente exportar um backup antes de continuar.</strong>
        </p>

        {confirmStep === 0 && (
          <button onClick={() => setConfirmStep(1)} className="px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer">
            Zerar todas as informações
          </button>
        )}

        {confirmStep === 1 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Tem certeza? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmStep(0)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200">
                Cancelar
              </button>
              <button onClick={() => setConfirmStep(2)} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer">
                Sim, continuar
              </button>
            </div>
          </div>
        )}

        {confirmStep === 2 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">
              Confirmação final: digite <span className="font-mono bg-white px-1 rounded border border-red-300">ZERAR</span> para excluir tudo.
            </p>
            <input className="input" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Digite ZERAR" />
            <div className="flex gap-2">
              <button onClick={() => { setConfirmStep(0); setConfirmText(''); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200">
                Cancelar
              </button>
              <button disabled={confirmText !== 'ZERAR' || busy} onClick={handleConfirmClear}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer disabled:opacity-40">
                Excluir Definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; width: 100%; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
