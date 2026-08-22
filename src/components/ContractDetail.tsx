import React, { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, ShoppingBag, X } from 'lucide-react';
import { Cliente, Contrato, StatusVenda, Venda } from '../types';
import { formatCurrency, formatDate, generateId, todayISO } from '../utils/formatters';

interface ContractDetailProps {
  contrato: Contrato;
  cliente: Cliente | undefined;
  vendas: Venda[];
  onBack: () => void;
  onEditContract: () => void;
  onDeleteContract: () => void;
  onSaveVendas: (vendas: Venda[]) => void;
}

const emptyVendaForm = { descricao: '', valor: '', data: todayISO(), status: 'confirmada' as StatusVenda, observacoes: '' };

const statusColor: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
};

export function ContractDetail({ contrato, cliente, vendas, onBack, onEditContract, onDeleteContract, onSaveVendas }: ContractDetailProps) {
  const [isVendaFormOpen, setIsVendaFormOpen] = useState(false);
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyVendaForm);

  const vendasDoContrato = vendas.filter(v => v.contratoId === contrato.id);
  const totalVendas = vendasDoContrato.reduce((sum, v) => sum + (v.valor || 0), 0);

  const openNewVenda = () => {
    setEditingVendaId(null);
    setForm(emptyVendaForm);
    setIsVendaFormOpen(true);
  };

  const openEditVenda = (v: Venda) => {
    setEditingVendaId(v.id);
    setForm({ descricao: v.descricao, valor: String(v.valor), data: v.data, status: v.status, observacoes: v.observacoes || '' });
    setIsVendaFormOpen(true);
  };

  const handleSaveVenda = () => {
    if (!form.descricao.trim()) return;
    const now = new Date().toISOString();
    if (editingVendaId) {
      onSaveVendas(vendas.map(v => v.id === editingVendaId
        ? { ...v, descricao: form.descricao, valor: parseFloat(form.valor) || 0, data: form.data, status: form.status, observacoes: form.observacoes, updatedAt: now }
        : v));
    } else {
      const nova: Venda = {
        id: generateId('vnd'),
        contratoId: contrato.id,
        descricao: form.descricao,
        valor: parseFloat(form.valor) || 0,
        data: form.data,
        status: form.status,
        observacoes: form.observacoes,
        createdAt: now,
        updatedAt: now,
      };
      onSaveVendas([nova, ...vendas]);
    }
    setIsVendaFormOpen(false);
  };

  const handleDeleteVenda = (id: string) => {
    if (!confirm('Excluir esta venda?')) return;
    onSaveVendas(vendas.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-heading font-bold text-slate-900">{contrato.titulo}</h1>
              <span className="text-xs text-slate-400 font-mono">#{contrato.numero}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                contrato.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                contrato.status === 'concluido' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                'bg-red-50 text-red-700 border-red-200'}`}>
                {contrato.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Data do contrato: {formatDate(contrato.dataContrato)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onEditContract} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={onDeleteContract} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Cliente</p>
            <p className="text-sm font-semibold text-slate-800">{cliente?.nome || 'Não vinculado'}</p>
            {cliente?.telefone && <p className="text-xs text-slate-500">{cliente.telefone}</p>}
            {cliente?.email && <p className="text-xs text-slate-500">{cliente.email}</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Valor do Contrato</p>
            <p className="text-sm font-semibold text-slate-800">{formatCurrency(contrato.valor)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Total em Vendas</p>
            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(totalVendas)} ({vendasDoContrato.length})</p>
          </div>
        </div>

        {contrato.observacoes && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-semibold">Observações</p>
            <p className="text-sm text-slate-600">{contrato.observacoes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-slate-900">Vendas Geradas</h2>
          <button onClick={openNewVenda} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
            <Plus className="w-4 h-4" /> Registrar Venda
          </button>
        </div>

        {vendasDoContrato.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhuma venda registrada para este contrato.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vendasDoContrato.map(v => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{v.descricao}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${statusColor[v.status]}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(v.data)}{v.observacoes ? ` · ${v.observacoes}` : ''}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-emerald-700 text-sm">{formatCurrency(v.valor)}</span>
                  <button onClick={() => openEditVenda(v)} className="p-1.5 text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteVenda(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isVendaFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg text-slate-900">
                {editingVendaId ? 'Editar Venda' : 'Registrar Venda'}
              </h2>
              <button onClick={() => setIsVendaFormOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Descrição da venda *" value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" type="number" step="0.01" placeholder="Valor (R$)" value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })} />
                <input className="input" type="date" value={form.data}
                  onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as StatusVenda })}>
                <option value="pendente">Pendente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              <textarea className="input" placeholder="Observações" rows={2} value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsVendaFormOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSaveVenda} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
                Salvar Venda
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; width: 100%; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
