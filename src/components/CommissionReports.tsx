import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { Corretor, SaleRecord, StatusComissao } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';

interface CommissionReportsProps {
  sales: SaleRecord[];
  corretores: Corretor[];
  onUpdateCommissionStatus: (saleId: string, newStatus: StatusComissao) => void;
  onViewSaleContract: (sale: SaleRecord) => void;
}

export const CommissionReports: React.FC<CommissionReportsProps> = ({
  sales,
  corretores,
  onUpdateCommissionStatus,
  onViewSaleContract,
}) => {
  // Obter meses disponíveis nas vendas
  const availableMonthsYears = React.useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      if (s.createdAt) {
        const parts = s.createdAt.split('-');
        if (parts.length >= 2) {
          set.add(`${parts[0]}-${parts[1]}`);
        }
      }
    });
    // Se estiver vazio, adiciona o mês atual
    const now = new Date();
    const currentMY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    set.add(currentMY);
    return Array.from(set).sort().reverse();
  }, [sales]);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(
    availableMonthsYears[0] || '2026-08'
  );
  const [selectedCorretorFilter, setSelectedCorretorFilter] = useState<string>('all');

  const getMonthName = (myString: string): string => {
    const [year, month] = myString.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} de ${year}`;
  };

  // Filtrar vendas pelo mês selecionado (ou todas)
  const filteredSales = sales.filter(s => {
    const matchDate = selectedMonthYear === 'all' || s.createdAt.startsWith(selectedMonthYear);
    const matchCorretor = selectedCorretorFilter === 'all' || s.seller.vendedorId === selectedCorretorFilter;
    return matchDate && matchCorretor;
  });

  // Estatísticas Financeiras Gerais
  let totalVGV = 0;
  let totalComissoes = 0;
  let comissoesPagas = 0;
  let comissoesPendentes = 0;
  let totalContratos = filteredSales.length;

  filteredSales.forEach(s => {
    totalVGV += s.financial.valorTotal;
    totalComissoes += s.seller.comissaoValor;
    if (s.seller.comissaoStatus === 'paga') {
      comissoesPagas += s.seller.comissaoValor;
    } else {
      comissoesPendentes += s.seller.comissaoValor;
    }
  });

  // Agrupamento por Corretor
  const brokerStats = corretores.map(corretor => {
    const brokerSales = filteredSales.filter(s => s.seller.vendedorId === corretor.id);
    const brokerVGV = brokerSales.reduce((acc, s) => acc + s.financial.valorTotal, 0);
    const brokerCommissionTotal = brokerSales.reduce((acc, s) => acc + s.seller.comissaoValor, 0);
    const brokerCommissionPaga = brokerSales
      .filter(s => s.seller.comissaoStatus === 'paga')
      .reduce((acc, s) => acc + s.seller.comissaoValor, 0);
    const brokerCommissionPendente = brokerSales
      .filter(s => s.seller.comissaoStatus !== 'paga')
      .reduce((acc, s) => acc + s.seller.comissaoValor, 0);

    return {
      corretor,
      salesCount: brokerSales.length,
      vgv: brokerVGV,
      totalCommission: brokerCommissionTotal,
      paidCommission: brokerCommissionPaga,
      pendingCommission: brokerCommissionPendente,
      sales: brokerSales,
    };
  }).filter(item => selectedCorretorFilter === 'all' || item.corretor.id === selectedCorretorFilter);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* CABEÇALHO DO RELATÓRIO */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                MÓDULO FINANCEIRO // COMISSÕES
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Cálculo Automático por Venda
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Relatório Mensal de Comissões por Vendedor
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Acompanhamento de Valor Geral de Vendas (VGV), honorários liquidados e pendências financeiras em tempo real.
            </p>
          </div>

          {/* FILTRO DE MÊS / ANO & IMPRESSÃO */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <select
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="bg-transparent text-slate-800 font-mono text-xs sm:text-sm focus:outline-none cursor-pointer font-bold"
              >
                <option value="all">Todos os Meses Acumulados</option>
                {availableMonthsYears.map(my => (
                  <option key={my} value={my}>
                    {getMonthName(my)}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedCorretorFilter}
              onChange={(e) => setSelectedCorretorFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl windows-input text-xs sm:text-sm font-semibold cursor-pointer text-slate-900"
            >
              <option value="all">Todos os Corretores</option>
              {corretores.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} (CRECI {c.creci})
                </option>
              ))}
            </select>

            <button
              type="button"
              id="btn-print-commissions"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO FINANCEIRO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-slate-700 p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider block font-bold">
              VGV Total no Período
            </span>
            <p className="text-2xl font-heading font-extrabold text-slate-900 font-mono">
              {formatCurrency(totalVGV)}
            </p>
            <span className="text-[11px] text-slate-600 font-mono block">
              {totalContratos} contrato(s) registrado(s)
            </span>
          </div>

          <div className="bg-slate-50 border border-emerald-300 border-l-4 border-l-emerald-600 p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-emerald-800 font-mono uppercase tracking-wider block font-bold flex items-center">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Total de Comissões Geradas
            </span>
            <p className="text-2xl font-heading font-extrabold text-emerald-700 font-mono">
              {formatCurrency(totalComissoes)}
            </p>
            <span className="text-[11px] text-slate-500 font-mono block">
              Honorários profissionais totais
            </span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-300 border-l-4 border-l-emerald-500 p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-emerald-800 font-mono uppercase tracking-wider block font-bold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Comissões Liquidadas
            </span>
            <p className="text-2xl font-heading font-extrabold text-emerald-700 font-mono">
              {formatCurrency(comissoesPagas)}
            </p>
            <span className="text-[11px] text-emerald-700 font-mono block font-semibold">
              {totalComissoes > 0 ? `${Math.round((comissoesPagas / totalComissoes) * 100)}% pago` : '0%'}
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-300 border-l-4 border-l-amber-500 p-4 rounded-xl space-y-1">
            <span className="text-[11px] text-amber-800 font-mono uppercase tracking-wider block font-bold flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Comissões Pendentes
            </span>
            <p className="text-2xl font-heading font-extrabold text-amber-700 font-mono">
              {formatCurrency(comissoesPendentes)}
            </p>
            <span className="text-[11px] text-amber-800 font-mono block">
              A liquidar no repasse
            </span>
          </div>
        </div>
      </div>

      {/* TABELA DE DESEMPENHO POR CORRETOR */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-heading font-bold text-slate-900">Extrato Consolidado por Vendedor</h2>
            <p className="text-xs text-slate-500 font-mono">
              {selectedMonthYear === 'all' ? 'Todos os meses acumulados' : getMonthName(selectedMonthYear)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs font-mono uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Corretor / Vendedor</th>
                <th className="px-4 py-3.5 text-center">Vendas Feitas</th>
                <th className="px-6 py-3.5">VGV Total Gerado</th>
                <th className="px-6 py-3.5">Comissão Total</th>
                <th className="px-6 py-3.5">Comissão Paga</th>
                <th className="px-6 py-3.5">Comissão Pendente</th>
                <th className="px-6 py-3.5 text-right no-print">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {brokerStats.map((stat) => (
                <tr key={stat.corretor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-sans">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs uppercase">
                        {stat.corretor.nome.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-heading font-bold text-slate-900">{stat.corretor.nome}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          CRECI: {stat.corretor.creci} | {stat.corretor.telefone}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className="font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg text-xs">
                      {stat.salesCount} lote(s)
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono font-medium text-slate-800">
                    {formatCurrency(stat.vgv)}
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                    {formatCurrency(stat.totalCommission)}
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                    {formatCurrency(stat.paidCommission)}
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-amber-700">
                    {formatCurrency(stat.pendingCommission)}
                  </td>

                  <td className="px-6 py-4 text-right no-print">
                    {stat.sales.length > 0 && (
                      <span className="text-xs font-medium font-sans">
                        {stat.pendingCommission === 0 ? (
                          <span className="text-emerald-800 font-mono font-bold inline-flex items-center justify-end bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Quitado
                          </span>
                        ) : (
                          <span className="text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                            Pendente
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALHAMENTO DE VENDAS INDIVIDUAIS & STATUS DE REPASSE */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden space-y-4 p-6">
        <h2 className="text-base font-heading font-bold text-slate-900 border-b border-slate-200 pb-3">
          Detalhamento de Vendas & Comissões do Mês
        </h2>

        {filteredSales.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm font-mono">
            Nenhuma venda registrada para o período selecionado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <div 
                key={sale.id}
                className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                      {sale.codigoVenda}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDateBR(sale.createdAt)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md">
                      {sale.property.empreendimento}
                    </span>
                  </div>
                  <p className="font-heading font-bold text-sm text-slate-900">
                    {sale.buyer.nome} <span className="text-slate-500 font-normal font-mono text-xs">(Lote: {sale.property.lote}, {sale.property.quadra})</span>
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    Corretor: <strong className="text-slate-900">{sale.seller.vendedorNome}</strong> ({sale.seller.comissaoPercentual}%)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[11px] block font-bold">Valor Venda:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(sale.financial.valorTotal)}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block font-bold">Comissão ({sale.seller.comissaoPercentual}%):</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatCurrency(sale.seller.comissaoValor)}</span>
                  </div>

                  {/* STATUS DA COMISSÃO COM BOTÃO PARA ALTERNAR */}
                  <div className="no-print">
                    <span className="text-slate-500 text-[11px] block mb-1 font-bold">Status Repasse:</span>
                    <select
                      value={sale.seller.comissaoStatus}
                      onChange={(e) => onUpdateCommissionStatus(sale.id, e.target.value as StatusComissao)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        sale.seller.comissaoStatus === 'paga'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="paga">Paga (Liquidada)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewSaleContract(sale)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer no-print"
                  >
                    Ver Contrato
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
