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
  FileCode2,
  Download,
  Eye,
  ShieldCheck,
  X,
  Layers,
  DollarSign,
  User,
  History,
  Check
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
  
  // Modal de detalhes do contrato vinculado
  const [selectedSaleForContractDetails, setSelectedSaleForContractDetails] = useState<SaleRecord | null>(null);

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

  const handleOpenContractDetails = (sale: SaleRecord) => {
    setSelectedSaleForContractDetails(sale);
  };

  const getContractTypeFriendly = (tipo: string) => {
    switch (tipo) {
      case 'exclusividade':
      case 'exclusividade_casas':
      case 'corretagem_exclusividade':
        return 'Contrato de Exclusividade';
      case 'a_vista':
      case 'compra_venda_a_vista':
      case 'venda_a_vista':
      case 'recibo_quitacao_a_vista':
        return 'Contrato de Compra e Venda à Vista';
      case 'parcelado':
      case 'compra_venda_parcelado':
      case 'venda_parcelada':
      default:
        return 'Compromisso de Compra e Venda Parcelado';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* CABEÇALHO DO PAINEL */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                RELATÓRIO DE VENDAS
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Extraído dos Contratos Emitidos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Relatório de Vendas dos Contratos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Extrato consolidado de tudo o que foi vendido através dos contratos gerados: valores totais, entradas, parcelas, compradores e lotes.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition-all flex items-center space-x-1.5 cursor-pointer no-print"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Imprimir / Exportar</span>
            </button>
            <button
              type="button"
              id="btn-new-sale-list"
              onClick={onNewSale}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer border border-emerald-600 no-print"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Contrato de Venda</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW ANALÍTICO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-700">
            <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider block font-bold">Total de Contratos</span>
            <p className="text-2xl font-heading font-extrabold text-slate-900 mt-1 font-mono">{sales.length} <span className="text-xs font-normal text-slate-500">emitidos</span></p>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 border-l-4 border-l-emerald-600">
            <span className="text-[11px] text-emerald-800 font-mono uppercase tracking-wider block font-bold">Valor Total das Vendas</span>
            <p className="text-2xl font-heading font-extrabold text-emerald-950 mt-1 font-mono">{formatCurrency(totalVendido)}</p>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 border-l-4 border-l-blue-600">
            <span className="text-[11px] text-blue-800 font-mono uppercase tracking-wider block font-bold">Entradas em Contrato</span>
            <p className="text-2xl font-heading font-extrabold text-blue-950 mt-1 font-mono">
              {formatCurrency(sales.reduce((acc, s) => acc + (s.financial.entrada || 0), 0))}
            </p>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 border-l-4 border-l-amber-600">
            <span className="text-[11px] text-amber-800 font-mono uppercase tracking-wider block font-bold">Contratos Assinados</span>
            <p className="text-2xl font-heading font-extrabold text-amber-950 mt-1 font-mono">
              {totalAssinados} <span className="text-xs font-normal text-amber-700">/ {sales.length} 100% assinados</span>
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
                  {/* BOTÃO OBRIGATÓRIO [ VER CONTRATO ] */}
                  <button
                    type="button"
                    onClick={() => handleOpenContractDetails(sale)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors border border-slate-800 shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    title="Ver Contrato Vinculado & Downloads"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>VER CONTRATO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSignatureModal(sale)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer border border-emerald-300"
                    title="Assinar Contrato na Tela"
                  >
                    <PenTool className="w-3.5 h-3.5 text-emerald-700" />
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

      {/* MODAL DE DETALHES DO CONTRATO VINCULADO */}
      {selectedSaleForContractDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* CABEÇALHO */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-extrabold text-slate-900">
                    Contrato Vinculado à Venda
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Referência: <span className="font-bold text-slate-800">VENDA #{selectedSaleForContractDetails.codigoVenda}</span> | Contrato ID: <span className="text-emerald-700 font-bold">{selectedSaleForContractDetails.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleForContractDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTEÚDO DOS DETALHES DO CONTRATO */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Tipo de Contrato</span>
                  <p className="text-sm font-bold text-slate-900 font-sans">
                    {getContractTypeFriendly(selectedSaleForContractDetails.tipoContrato)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Status da Assinatura</span>
                  {selectedSaleForContractDetails.signatures.isFullySigned ? (
                    <span className="text-emerald-700 font-bold flex items-center text-sm font-sans">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Assinado Digitalmente
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center text-sm font-sans">
                      <Clock className="w-4 h-4 mr-1 text-amber-600" /> Aguardando Assinatura
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Data de Emissão</span>
                  <p className="text-sm font-bold text-slate-900">
                    {formatDateBR(selectedSaleForContractDetails.createdAt)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Cliente / Adquirente</span>
                  <p className="text-sm font-bold text-slate-900 font-sans">
                    {selectedSaleForContractDetails.buyer.nome}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    CPF: {selectedSaleForContractDetails.buyer.cpf}
                  </p>
                </div>
              </div>

              {/* DADOS DO IMÓVEL E FINANCEIRO */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                <div>
                  <span className="text-[11px] text-emerald-900 uppercase font-bold font-mono block">Imóvel Negociado</span>
                  <p className="text-sm font-bold text-slate-900">
                    Lote {selectedSaleForContractDetails.property.lote}, Quadra {selectedSaleForContractDetails.property.quadra}
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    {selectedSaleForContractDetails.property.empreendimento} ({selectedSaleForContractDetails.property.areaM2} m²)
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <span className="text-[11px] text-emerald-900 uppercase font-bold block">Valor Total</span>
                  <p className="text-base font-extrabold text-emerald-800">
                    {formatCurrency(selectedSaleForContractDetails.financial.valorTotal)}
                  </p>
                </div>
              </div>

              {/* ORIGEM E CENTRALIZAÇÃO */}
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-sans">
                ℹ️ <strong>Origem Centralizada:</strong> Este contrato pertence e foi emitido pelo módulo <strong className="text-slate-900">“Modelos e Documentos”</strong>. A venda armazena sua referência unificada para evitar duplicações.
              </div>
            </div>

            {/* BOTÕES DE AÇÃO: DOCX, PDF, ASSINAR DIGITAL */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {onGenerateWordDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      const sale = selectedSaleForContractDetails;
                      setSelectedSaleForContractDetails(null);
                      onGenerateWordDoc(sale);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>[ DOC ]</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const sale = selectedSaleForContractDetails;
                    setSelectedSaleForContractDetails(null);
                    onViewContract(sale);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{selectedSaleForContractDetails.signatures.isFullySigned ? '[ PDF ASSINADO ]' : '[ PDF ]'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sale = selectedSaleForContractDetails;
                    setSelectedSaleForContractDetails(null);
                    onViewContract(sale);
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer border border-slate-800"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>[ ASSINAR DIGITAL ]</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedSaleForContractDetails(null)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

