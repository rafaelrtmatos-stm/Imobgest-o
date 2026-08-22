import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, User } from 'lucide-react';
import { Cliente } from '../types';
import { generateId } from '../utils/formatters';

interface ClientManagerProps {
  clientes: Cliente[];
  onSaveClientes: (clientes: Cliente[]) => void;
  searchTerm: string;
}

const emptyForm = { nome: '', telefone: '', email: '', cpf: '', endereco: '', observacoes: '' };

export function ClientManager({ clientes, onSaveClientes, searchTerm }: ClientManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      (c.telefone || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome, telefone: c.telefone || '', email: c.email || '',
      cpf: c.cpf || '', endereco: c.endereco || '', observacoes: c.observacoes || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      onSaveClientes(clientes.map(c => c.id === editingId ? { ...c, ...form, updatedAt: now } : c));
    } else {
      const novo: Cliente = { id: generateId('cli'), ...form, createdAt: now, updatedAt: now };
      onSaveClientes([novo, ...clientes]);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este cliente? Contratos vinculados manterão a referência antiga.')) return;
    onSaveClientes(clientes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Cadastre e consulte os clientes vinculados aos contratos.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-slate-900">{c.nome}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-500 space-y-0.5">
                {c.telefone && <p>📞 {c.telefone}</p>}
                {c.email && <p>✉️ {c.email}</p>}
                {c.cpf && <p>🪪 {c.cpf}</p>}
                {c.endereco && <p>📍 {c.endereco}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg text-slate-900">
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input col-span-2" placeholder="Nome completo *" value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })} />
              <input className="input" placeholder="Telefone / WhatsApp" value={form.telefone}
                onChange={e => setForm({ ...form, telefone: e.target.value })} />
              <input className="input" placeholder="E-mail" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="input" placeholder="CPF" value={form.cpf}
                onChange={e => setForm({ ...form, cpf: e.target.value })} />
              <input className="input" placeholder="Endereço" value={form.endereco}
                onChange={e => setForm({ ...form, endereco: e.target.value })} />
              <textarea className="input col-span-2" placeholder="Observações" rows={2} value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
