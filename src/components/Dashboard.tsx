import React from 'react';
import { FileText, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { Cliente, Contrato, Venda } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DashboardProps {
  contratos: Contrato[];
  clientes: Cliente[];
  vendas: Venda[];
  onNewContract: () => void;
}

export function Dashboard({ contratos, clientes, vendas, onNewContract }: DashboardProps) {
  const totalVendido = vendas.reduce((sum, v) => sum + (v.valor || 0), 0);
  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;

  const cards = [
    { label: 'Contratos', value: contratos.length, sub: `${contratosAtivos} ativos`, icon: FileText, color: 'emerald' },
    { label: 'Clientes', value: clientes.length, sub: 'cadastrados', icon: Users, color: 'sky' },
    { label: 'Vendas', value: vendas.length, sub: 'registradas', icon: ShoppingBag, color: 'amber' },
    { label: 'Total em Vendas', value: formatCurrency(totalVendido), sub: 'valor acumulado', icon: TrendingUp, color: 'violet' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Visão Geral</h1>
          <p className="text-sm text-slate-500">Resumo dos contratos, clientes e vendas.</p>
        </div>
        <button
          onClick={onNewContract}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          + Novo Contrato
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className={`w-10 h-10 rounded-xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label} · {card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="font-heading font-bold text-slate-900 mb-3">Últimos Contratos</h2>
        {contratos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {contratos.slice(0, 5).map(c => {
              const cliente = clientes.find(cl => cl.id === c.clienteId);
              return (
                <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{c.titulo} <span className="text-slate-400 font-normal">#{c.numero}</span></p>
                    <p className="text-slate-500">{cliente?.nome || 'Sem cliente vinculado'}</p>
                  </div>
                  <span className="font-semibold text-emerald-700">{formatCurrency(c.valor)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
