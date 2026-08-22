import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  PenTool, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Filter, 
  PlusCircle, 
  Building2, 
  Edit3,
  Calendar,
  FileCode2
} from 'lucide-react';
import { SaleRecord, StatusVenda } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';

interface SalesListProps {
  sales: SaleRecord[];
  onViewContract: (sale: SaleRecord) => void;
  onEditSale: (sale: SaleRecord) => void;
  onOpenSignatureModal: (sale: SaleRecord) => void;
  onDeleteSale: (saleId: string) => void;
  onNewSale: () => void;
  onGenerateWordDoc?: (sale: SaleRecord) => void;
}

export const SalesList: React.FC<SalesListProps> = ({
  sales,
  onViewContract,
  onEditSale,
  onOpenSignatureModal,
  onDeleteSale,
  onNewSale,
  onGenerateWordDoc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusVenda>('all');
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState('all');

  // Obter lista única de empreendimentos
  const uniqueEmpreendimentos = Array.from(
    new Set(sales.map(s => s.property.empreendimento))
  );

  const filteredSales = sales.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.buyer.nome.toLowerCase().includes(term) ||
      s.buyer.cpf.includes(term) ||
      s.codigoVenda.toLowerCase().includes(term) ||
      s.property.lote.toLowerCase().includes(term) ||
      s.property.quadra.toLowerCase().includes(term) ||
      s.seller.vendedorNome.toLowerCase().includes(term);

    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchEmp = empreendimentoFilter === 'all' || s.property.empreendimento === empreendimentoFilter;

    return matchSearch && matchStatus && matchEmp;
  });

  const totalVendido = sales.reduce((acc, s) => acc + s.financial.valorTotal, 0);
  const totalAssinados = sales.filter(s => s.signatures.isFullySigned).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* CABEÇALHO DO PAINEL */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                CENTRAL DE VENDAS
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Gestão Imobiliária
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Base de Vendas & Contratos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Controle de transações cadastradas, status de assinaturas e download de minutas contratuais.
            </p>
          </div>

          <button
            type="button"
            id="btn-new-sale-list"
            onClick={onNewSale}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer border border-emerald-600"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Nova Venda</span>
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-700">
            <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider block font-bold">Total de Vendas</span>
            <p className="text-2xl font-heading font-extrabold text-slate-900 mt-1 font-mono">{sales.length} <span className="text-xs font-normal text-slate-500">contratos</span></p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-emerald-300 border-l-4 border-l-emerald-600">
            <span className="text-[11px] text-emerald-800 font-mono uppercase tracking-wider block font-bold">Volume Total Geral (VGV)</span>
            <p className="text-2xl font-heading font-extrabold text-emerald-700 mt-1 font-mono">{formatCurrency(totalVendido)}</p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-300 border-l-4 border-l-emerald-500">
            <span className="text-[11px] text-emerald-800 font-mono uppercase tracking-wider block font-bold">Contratos Assinados</span>
            <p className="text-2xl font-heading font-extrabold text-emerald-700 mt-1 font-mono">
              {totalAssinados} <span className="text-xs font-normal text-slate-600">({sales.length > 0 ? Math.round((totalAssinados / sales.length) * 100) : 0}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* BUSCA TEXTUAL */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-sales-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, CPF, lote, quadra ou corretor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl windows-input text-xs sm:text-sm placeholder-slate-400 font-mono text-slate-900"
          />
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-mono text-slate-800 focus:outline-none cursor-pointer font-bold"
            >
              <option value="all">Todos os Status</option>
              <option value="assinado">Assinado</option>
              <option value="pendente_assinatura">Pendente de Assinatura</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </div>

          <select
            value={empreendimentoFilter}
            onChange={(e) => setEmpreendimentoFilter(e.target.value)}
            className="px-3 py-2 rounded-xl windows-input text-xs font-mono cursor-pointer font-bold text-slate-800"
          >
            <option value="all">Todos os Empreendimentos</option>
            {uniqueEmpreendimentos.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA DE VENDAS */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-heading font-semibold text-slate-700">Nenhum registro localizado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente redefinir os parâmetros de busca ou crie uma nova proposta de venda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                {/* DADOS PRINCIPAIS */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">
                      {sale.codigoVenda}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center font-mono">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {formatDateBR(sale.createdAt)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {sale.property.empreendimento}
                    </span>
                    {sale.signatures.isFullySigned ? (
                      <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Assinado Digitalmente
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-300 flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-amber-600" /> Aguardando Assinatura
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-heading font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {sale.buyer.nome}
                  </h3>

                  <div className="text-xs text-slate-600 flex flex-wrap gap-y-1 gap-x-4 font-mono">
                    <span>CPF: <strong className="text-slate-800">{sale.buyer.cpf}</strong></span>
                    <span>RG: <strong className="text-slate-800">{sale.buyer.rg}</strong></span>
                    <span>Lote: <strong className="text-emerald-700 font-bold">{sale.property.lote}</strong> ({sale.property.quadra})</span>
                    <span>Vendedor: <strong className="text-slate-800">{sale.seller.vendedorNome}</strong></span>
                  </div>
                </div>

                {/* VALORES E FINANCEIRO */}
                <div className="flex flex-wrap lg:flex-col lg:items-end gap-2 lg:gap-0.5 text-xs font-mono">
                  <span className="text-[11px] text-slate-500 uppercase font-bold">Valor da Venda</span>
                  <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {formatCurrency(sale.financial.valorTotal)}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {sale.financial.tipoPagamento === 'a_vista' 
                      ? '● À Vista' 
                      : `● Entr: ${formatCurrency(sale.financial.entrada)} + ${sale.financial.quantidadeParcelas}x`}
                  </span>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                  {onGenerateWordDoc && (
                    <button
                      type="button"
                      onClick={() => onGenerateWordDoc(sale)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg transition-colors border border-blue-200 shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      title="Gerar Documento Word / PDF a partir dos Modelos Cadastrados"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Gerar Word/PDF</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onViewContract(sale)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-300 shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    title="Visualizar Contrato Padrão"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Contrato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSignatureModal(sale)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer border border-slate-800"
                    title="Assinar Contrato na Tela"
                  >
                    <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assinar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditSale(sale)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                    title="Editar Dados da Venda"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir a venda de ${sale.buyer.nome}?`)) {
                        onDeleteSale(sale.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                    title="Excluir Venda"
                  >
                    <Trash2 className="w-4 h-4" />
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
