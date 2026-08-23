import React, { useMemo } from 'react';
import { 
  Building2, 
  DollarSign, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  MapPin, 
  PlusCircle, 
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Cliente, Corretor, Empreendimento, SaleRecord } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';

interface DashboardProps {
  sales: SaleRecord[];
  empreendimentos: Empreendimento[];
  clientes: Cliente[];
  corretores: Corretor[];
  onNavigate: (tab: 'empreendimentos' | 'clientes' | 'sales_list' | 'sales_form' | 'word_templates' | 'commissions') => void;
  onNewSale: () => void;
  onSelectSale: (sale: SaleRecord) => void;
  onOpenWordDoc: (sale: SaleRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  sales,
  empreendimentos,
  clientes,
  corretores,
  onNavigate,
  onNewSale,
  onSelectSale,
  onOpenWordDoc,
}) => {
  // Cálculos consolidados do Dashboard
  const metrics = useMemo(() => {
    // Total vendido
    const totalVendido = sales.reduce((acc, s) => acc + (s.financial.valorTotal || 0), 0);
    
    // Contagem de lotes em todos os empreendimentos
    let totalLotesGeral = 0;
    let lotesDisponiveis = 0;
    let lotesReservados = 0;
    let lotesVendidos = 0;

    empreendimentos.forEach(emp => {
      emp.quadras.forEach(q => {
        q.lotes.forEach(l => {
          totalLotesGeral++;
          if (l.status === 'disponivel') lotesDisponiveis++;
          else if (l.status === 'reservado') lotesReservados++;
          else if (l.status === 'vendido') lotesVendidos++;
        });
      });
    });

    // Total de comissões geradas e pendentes
    const totalComissoes = sales.reduce((acc, s) => acc + (s.seller.comissaoValor || 0), 0);
    const comissoesPagas = sales
      .filter(s => s.seller.comissaoStatus === 'paga')
      .reduce((acc, s) => acc + (s.seller.comissaoValor || 0), 0);
    const comissoesPendentes = sales
      .filter(s => s.seller.comissaoStatus !== 'paga')
      .reduce((acc, s) => acc + (s.seller.comissaoValor || 0), 0);

    // Vendas assinadas vs pendentes
    const assinadas = sales.filter(s => s.signatures.isFullySigned).length;
    const pendentesAssinatura = sales.filter(s => !s.signatures.isFullySigned).length;

    // Percentual de ocupação/vendas
    const percentVendido = totalLotesGeral > 0 
      ? Math.round((lotesVendidos / totalLotesGeral) * 100) 
      : 0;

    return {
      totalVendido,
      totalLotesGeral,
      lotesDisponiveis,
      lotesReservados,
      lotesVendidos,
      totalComissoes,
      comissoesPagas,
      comissoesPendentes,
      assinadas,
      pendentesAssinatura,
      percentVendido,
    };
  }, [sales, empreendimentos]);

  // Vendas recentes ordenadas
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              SISTEMA DE CONTRATOS & VENDAS
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Integrado com Nuvem Supabase
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Painel Executivo de Contratos & Vendas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Relatórios analíticos das vendas geradas pelos contratos, controle de parcelas, clientes e minutas Word.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('word_templates')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Gerador de Contratos</span>
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95 border border-emerald-500"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Contrato de Venda</span>
          </button>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendido */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Volume de Vendas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-heading font-extrabold text-slate-900 mt-2">
            {formatCurrency(metrics.totalVendido)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>{sales.length} vendas registradas</span>
            <span className="font-semibold text-emerald-700">{metrics.percentVendido}% dos lotes</span>
          </div>
        </div>

        {/* Lotes Disponíveis / Ocupação */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estoque de Lotes</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-heading font-extrabold text-slate-900 mt-2">
            {metrics.lotesDisponiveis}{' '}
            <span className="text-sm font-normal text-slate-500">/ {metrics.totalLotesGeral} lotes</span>
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 font-bold">{metrics.lotesVendidos} vendidos</span>
            <span className="text-amber-700 font-bold">{metrics.lotesReservados} reservados</span>
          </div>
        </div>

        {/* Clientes & Compradores */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Base de Clientes</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-heading font-extrabold text-slate-900 mt-2">
            {clientes.length}{' '}
            <span className="text-sm font-normal text-slate-500">cadastrados</span>
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>{corretores.length} corretores ativos</span>
            <button 
              onClick={() => onNavigate('clientes')}
              className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Gerenciar →
            </button>
          </div>
        </div>

        {/* Assinaturas & Contratos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Assinaturas Digitais</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-heading font-extrabold text-slate-900 mt-2">
            {metrics.assinadas}{' '}
            <span className="text-sm font-normal text-slate-500">assinados</span>
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="text-amber-700 font-bold">{metrics.pendentesAssinatura} pendentes</span>
            <button 
              onClick={() => onNavigate('sales_list')}
              className="font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
            >
              Ver vendas →
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE 2 COLUNAS: EMPREENDIMENTOS + VENDAS RECENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (2/3): EMPREENDIMENTOS & STATUS DE OCUPAÇÃO */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-heading font-bold text-slate-900">
                  Empreendimentos & Disponibilidade
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('empreendimentos')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
              >
                <span>Ver Mapa Completo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {empreendimentos.map((emp) => {
                let total = 0;
                let disp = 0;
                let vend = 0;
                let res = 0;

                emp.quadras.forEach(q => {
                  q.lotes.forEach(l => {
                    total++;
                    if (l.status === 'disponivel') disp++;
                    else if (l.status === 'vendido') vend++;
                    else if (l.status === 'reservado') res++;
                  });
                });

                const perc = total > 0 ? Math.round((vend / total) * 100) : 0;

                return (
                  <div 
                    key={emp.id} 
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3 cursor-pointer group"
                    onClick={() => onNavigate('empreendimentos')}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {emp.nome}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                          {emp.cidade} - {emp.uf}
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                        {perc}% vendido
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                        <div style={{ width: `${perc}%` }} className="bg-emerald-600 h-full" title={`Vendido: ${vend}`} />
                        <div style={{ width: `${total > 0 ? (res / total) * 100 : 0}%` }} className="bg-amber-500 h-full" title={`Reservado: ${res}`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-1">
                        <span className="text-emerald-700 font-semibold">{disp} disponíveis</span>
                        <span className="text-slate-500">{total} total</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL DE COMISSÕES E REPASSES */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-heading font-bold text-slate-900">
                  Resumo Financeiro de Comissões
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('commissions')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
              >
                <span>Relatório Detalhado</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Total de Comissões</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {formatCurrency(metrics.totalComissoes)}
                </p>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800">Comissões Pagas</span>
                <p className="text-lg font-bold text-emerald-900 mt-1">
                  {formatCurrency(metrics.comissoesPagas)}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-800">A Pagar / Pendentes</span>
                <p className="text-lg font-bold text-amber-900 mt-1">
                  {formatCurrency(metrics.comissoesPendentes)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (1/3): ÚLTIMAS VENDAS E ATALHOS */}
        <div className="space-y-4">
          
          {/* CARTÃO DE AÇÕES RÁPIDAS */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
            <h3 className="font-heading font-bold text-sm text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ações Rápidas</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={onNewSale}
                className="w-full flex items-center justify-between p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4" />
                  <span>Cadastrar Venda Direta</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('word_templates')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-semibold text-xs transition-all cursor-pointer border border-slate-700"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Gerar Contrato Word (.docx)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('clientes')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-semibold text-xs transition-all cursor-pointer border border-slate-700"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Cadastrar Novo Cliente</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VENDAS RECENTES */}
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Últimas Vendas</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('sales_list')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Ver todas ({sales.length})
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhuma venda registrada ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80 transition-all text-xs space-y-1.5 cursor-pointer group"
                    onClick={() => onSelectSale(sale)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                        {sale.codigoVenda}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.signatures.isFullySigned 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sale.signatures.isFullySigned ? 'Assinado' : 'Pendente'}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800 truncate">
                      {sale.buyer.nome}
                    </p>

                    <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                      <span>{sale.property.quadra} • {sale.property.lote}</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(sale.financial.valorTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
