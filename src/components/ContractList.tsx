import React, { useMemo } from 'react';
import { Plus, FileText, ChevronRight } from 'lucide-react';
import { Cliente, Contrato, Venda } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ContractListProps {
  contratos: Contrato[];
  clientes: Cliente[];
  vendas: Venda[];
  searchTerm: string;
  onOpenContract: (id: string) => void;
  onNewContract: () => void;
}

const statusColor: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  concluido: 'bg-sky-50 text-sky-700 border-sky-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
};

export function ContractList({ contratos, clientes, vendas, searchTerm, onOpenContract, onNewContract }: ContractListProps) {
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contratos;
    return contratos.filter(c => {
      const cliente = clientes.find(cl => cl.id === c.clienteId);
      const vendasDoContrato = vendas.filter(v => v.contratoId === c.id);
      return (
        c.numero.toLowerCase().includes(term) ||
        c.titulo.toLowerCase().includes(term) ||
        (cliente?.nome || '').toLowerCase().includes(term) ||
        vendasDoContrato.some(v => v.descricao.toLowerCase().includes(term))
      );
    });
  }, [contratos, clientes, vendas, searchTerm]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">Cadastre, edite e consulte contratos e suas vendas vinculadas.</p>
        </div>
        <button
          onClick={onNewContract}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhum contrato encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {filtered.map(c => {
            const cliente = clientes.find(cl => cl.id === c.clienteId);
            const vendasDoContrato = vendas.filter(v => v.contratoId === c.id);
            return (
              <button
                key={c.id}
                onClick={() => onOpenContract(c.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{c.titulo}</p>
                    <span className="text-xs text-slate-400 font-mono">#{c.numero}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${statusColor[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {cliente?.nome || 'Sem cliente vinculado'} · {formatDate(c.dataContrato)} · {vendasDoContrato.length} venda(s)
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-3">
                  <span className="font-semibold text-emerald-700 text-sm">{formatCurrency(c.valor)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
