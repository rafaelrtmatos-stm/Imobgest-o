import React, { useEffect, useState } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ClientManager } from './components/ClientManager';
import { ContractList } from './components/ContractList';
import { ContractForm } from './components/ContractForm';
import { ContractDetail } from './components/ContractDetail';
import { BackupPanel } from './components/BackupPanel';
import { Cliente, Contrato, Venda } from './types';
import {
  getStoredClientes, getStoredContratos, getStoredVendas,
  saveStoredClientes, saveStoredContratos, saveStoredVendas,
} from './utils/storage';
import { getStoredSupabaseConfig, syncAllFromSupabase } from './utils/supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const [clientes, setClientes] = useState<Cliente[]>(() => getStoredClientes());
  const [contratos, setContratos] = useState<Contrato[]>(() => getStoredContratos());
  const [vendas, setVendas] = useState<Venda[]>(() => getStoredVendas());

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contrato | null>(null);

  useEffect(() => {
    const init = async () => {
      const config = getStoredSupabaseConfig();
      if (config.url && config.anonKey) {
        try {
          const res = await syncAllFromSupabase();
          if (res.success && res.data) {
            if (res.data.clientes?.length) setClientes(res.data.clientes);
            if (res.data.contratos?.length) setContratos(res.data.contratos);
            if (res.data.vendas?.length) setVendas(res.data.vendas);
          }
        } catch (e) {
          console.warn('Erro ao carregar dados do Supabase:', e);
        }
      }
    };
    init();
  }, []);

  useEffect(() => { saveStoredClientes(clientes); }, [clientes]);
  useEffect(() => { saveStoredContratos(contratos); }, [contratos]);
  useEffect(() => { saveStoredVendas(vendas); }, [vendas]);

  const handleNewContract = () => {
    setEditingContract(null);
    setIsContractFormOpen(true);
  };

  const handleEditContract = () => {
    const c = contratos.find(c => c.id === selectedContractId);
    if (c) {
      setEditingContract(c);
      setIsContractFormOpen(true);
    }
  };

  const handleSaveContract = (contrato: Contrato) => {
    setContratos(prev => {
      const exists = prev.some(c => c.id === contrato.id);
      return exists ? prev.map(c => c.id === contrato.id ? contrato : c) : [contrato, ...prev];
    });
    setIsContractFormOpen(false);
    setSelectedContractId(contrato.id);
    setActiveTab('contratos');
  };

  const handleUpdateContrato = (contrato: Contrato) => {
    setContratos(prev => prev.map(c => c.id === contrato.id ? { ...contrato, updatedAt: new Date().toISOString() } : c));
  };

  const handleDeleteContract = () => {
    if (!selectedContractId) return;
    if (!confirm('Excluir este contrato e todas as vendas vinculadas a ele?')) return;
    setContratos(prev => prev.filter(c => c.id !== selectedContractId));
    setVendas(prev => prev.filter(v => v.contratoId !== selectedContractId));
    setSelectedContractId(null);
  };

  const handleImportBackup = (data: { clientes: Cliente[]; contratos: Contrato[]; vendas: Venda[] }) => {
    if (data.clientes.length) setClientes(data.clientes);
    if (data.contratos.length) setContratos(data.contratos);
    if (data.vendas.length) setVendas(data.vendas);
  };

  const handleClearAll = () => {
    setClientes([]);
    setContratos([]);
    setVendas([]);
    setSelectedContractId(null);
    setActiveTab('dashboard');
  };

  const selectedContract = contratos.find(c => c.id === selectedContractId) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => { setActiveTab(tab); setSelectedContractId(null); }}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard contratos={contratos} clientes={clientes} vendas={vendas} onNewContract={handleNewContract} />
        )}

        {activeTab === 'contratos' && !selectedContract && (
          <ContractList
            contratos={contratos}
            clientes={clientes}
            vendas={vendas}
            searchTerm={searchTerm}
            onOpenContract={(id) => setSelectedContractId(id)}
            onNewContract={handleNewContract}
          />
        )}

        {activeTab === 'contratos' && selectedContract && (
          <ContractDetail
            contrato={selectedContract}
            cliente={clientes.find(c => c.id === selectedContract.clienteId)}
            vendas={vendas}
            onBack={() => setSelectedContractId(null)}
            onEditContract={handleEditContract}
            onDeleteContract={handleDeleteContract}
            onSaveVendas={setVendas}
            onUpdateContrato={handleUpdateContrato}
          />
        )}

        {activeTab === 'clientes' && (
          <ClientManager clientes={clientes} onSaveClientes={setClientes} searchTerm={searchTerm} />
        )}

        {activeTab === 'backup' && (
          <BackupPanel
            clientes={clientes}
            contratos={contratos}
            vendas={vendas}
            onImport={handleImportBackup}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {isContractFormOpen && (
        <ContractForm
          contrato={editingContract}
          clientes={clientes}
          onSaveClientes={setClientes}
          onSave={handleSaveContract}
          onClose={() => setIsContractFormOpen(false)}
        />
      )}

      <footer className="bg-white text-slate-500 text-xs py-5 border-t border-slate-200 text-center no-print">
        <div className="max-w-7xl mx-auto px-4">
          © {new Date().getFullYear()} <strong className="text-slate-900">ImobGestão</strong> — Gestão de Contratos
        </div>
      </footer>
    </div>
  );
}
