import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Cliente, Contrato, StatusContrato } from '../types';
import { generateId, todayISO } from '../utils/formatters';

interface ContractFormProps {
  contrato: Contrato | null;
  clientes: Cliente[];
  onSaveClientes: (clientes: Cliente[]) => void;
  onSave: (contrato: Contrato) => void;
  onClose: () => void;
}

export function ContractForm({ contrato, clientes, onSaveClientes, onSave, onClose }: ContractFormProps) {
  const [titulo, setTitulo] = useState(contrato?.titulo || '');
  const [numero, setNumero] = useState(contrato?.numero || `C-${Date.now().toString().slice(-6)}`);
  const [clienteId, setClienteId] = useState(contrato?.clienteId || '');
  const [dataContrato, setDataContrato] = useState(contrato?.dataContrato || todayISO());
  const [valor, setValor] = useState(String(contrato?.valor ?? ''));
  const [status, setStatus] = useState<StatusContrato>(contrato?.status || 'ativo');
  const [observacoes, setObservacoes] = useState(contrato?.observacoes || '');

  const [novoClienteMode, setNovoClienteMode] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [novoClienteEmail, setNovoClienteEmail] = useState('');

  const handleCreateCliente = () => {
    if (!novoClienteNome.trim()) return;
    const now = new Date().toISOString();
    const novo: Cliente = {
      id: generateId('cli'),
      nome: novoClienteNome.trim(),
      telefone: novoClienteTelefone.trim(),
      email: novoClienteEmail.trim(),
      createdAt: now,
      updatedAt: now,
    };
    onSaveClientes([novo, ...clientes]);
    setClienteId(novo.id);
    setNovoClienteMode(false);
    setNovoClienteNome('');
    setNovoClienteTelefone('');
    setNovoClienteEmail('');
  };

  const handleSubmit = () => {
    if (!titulo.trim() || !clienteId) return;
    const now = new Date().toISOString();
    const result: Contrato = {
      id: contrato?.id || generateId('ctr'),
      numero: numero.trim(),
      clienteId,
      titulo: titulo.trim(),
      dataContrato,
      valor: parseFloat(valor) || 0,
      status,
      observacoes: observacoes.trim(),
      createdAt: contrato?.createdAt || now,
      updatedAt: now,
    };
    onSave(result);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-slate-900">
            {contrato ? 'Editar Contrato' : 'Novo Contrato'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input col-span-2" placeholder="Título do contrato *" value={titulo}
            onChange={e => setTitulo(e.target.value)} />
          <input className="input" placeholder="Número" value={numero}
            onChange={e => setNumero(e.target.value)} />
          <input className="input" type="date" value={dataContrato}
            onChange={e => setDataContrato(e.target.value)} />
          <input className="input" type="number" step="0.01" placeholder="Valor (R$)" value={valor}
            onChange={e => setValor(e.target.value)} />
          <select className="input" value={status} onChange={e => setStatus(e.target.value as StatusContrato)}>
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <textarea className="input col-span-2" placeholder="Observações" rows={2} value={observacoes}
            onChange={e => setObservacoes(e.target.value)} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Cliente vinculado *</p>
          {!novoClienteMode ? (
            <div className="flex gap-2">
              <select className="input flex-1" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button onClick={() => setNovoClienteMode(true)}
                className="px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer whitespace-nowrap">
                + Novo
              </button>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input className="input w-full" placeholder="Nome do cliente *" value={novoClienteNome}
                onChange={e => setNovoClienteNome(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Telefone" value={novoClienteTelefone}
                  onChange={e => setNovoClienteTelefone(e.target.value)} />
                <input className="input" placeholder="E-mail" value={novoClienteEmail}
                  onChange={e => setNovoClienteEmail(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNovoClienteMode(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleCreateCliente} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
                  Salvar Cliente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
            Salvar Contrato
          </button>
        </div>
      </div>
      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; width: 100%; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
