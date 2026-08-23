import React, { useState } from 'react';
import { 
  Printer, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Calendar, 
  MessageCircle
} from 'lucide-react';
import { CompanyConfig, SaleRecord, TipoContrato } from '../types';
import { generateContractHTML } from '../utils/contractTemplates';
import { formatCurrency, gerarCronogramaParcelas } from '../utils/formatters';
import { DigitalSignatureArea } from './DigitalSignatureArea';

interface ContractViewerProps {
  sale: SaleRecord;
  companyConfig?: CompanyConfig;
  onOpenSignatureModal: () => void;
  onChangeContractType: (type: TipoContrato) => void;
  onBackToSales: () => void;
  onOpenPublicSignModal?: (token: string) => void;
  onOpenValidationModal?: (validationToken: string) => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  sale,
  companyConfig = {
    nomeFantasia: 'IMOB GESTÃO IMOBILIÁRIA',
    razaoSocial: 'IMOB GESTÃO EMPREENDIMENTOS LTDA',
    cnpj: '12.345.678/0001-90',
    creci: '12345-J',
    endereco: 'Av. Paulista, 1000, Cj 101 - Bela Vista, São Paulo/SP',
    telefone: '(11) 98765-4321',
    email: 'contato@imobgestao.com.br'
  },
  onOpenSignatureModal,
  onChangeContractType,
  onBackToSales,
  onOpenPublicSignModal,
  onOpenValidationModal,
}) => {
  const [showParcelasModal, setShowParcelasModal] = useState(false);

  const contractHTML = generateContractHTML(sale);
  const parcelas = gerarCronogramaParcelas(
    sale.financial.valorTotal,
    sale.financial.entrada,
    sale.financial.quantidadeParcelas,
    sale.financial.dataVencimento
  );

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const isParcelado = sale.tipoContrato === 'compra_venda_parcelado';
    const text = `*PROPOSTA & CONTRATO IMOBILIÁRIO - ${sale.property.empreendimento}*
Código do Registro: ${sale.codigoVenda}
Adquirente: ${sale.buyer.nome} (CPF: ${sale.buyer.cpf})
Imóvel: Quadra ${sale.property.quadra}, Lote ${sale.property.lote} (${sale.property.areaM2}m²)
Valor Total: ${formatCurrency(sale.financial.valorTotal)}
${isParcelado ? `Entrada: ${formatCurrency(sale.financial.entrada)} + ${sale.financial.quantidadeParcelas}x de ${formatCurrency(sale.financial.valorParcela)}` : 'Condição: Pagamento Integral À Vista'}
Corretor Responsável: ${sale.seller.vendedorNome} (CRECI: ${sale.seller.vendedorCreci})

Status da Assinatura: ${sale.signatures.isFullySigned ? '[ASSINADO DIGITALMENTE]' : '[AGUARDANDO ASSINATURA]'}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* BARRA DE CONTROLES E AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm no-print space-y-5 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToSales}
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Voltar para a Lista"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  Minuta Jurídica
                </span>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-bold">
                  {sale.codigoVenda}
                </span>
                {sale.signatures.isFullySigned ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Assinado Digitalmente
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Pendente de Assinatura
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mt-1">
                {sale.buyer.nome} — {sale.property.empreendimento}
              </h1>
            </div>
          </div>

          {/* BOTÕES DE IMPRESSÃO & ASSINATURA */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="btn-print-contract"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              id="btn-sign-contract-now"
              onClick={onOpenSignatureModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 active:scale-95 cursor-pointer border border-emerald-600"
            >
              <PenTool className="w-4 h-4" />
              <span>Assinatura Rápida</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors border border-emerald-300 cursor-pointer shadow-xs"
              title="Compartilhar via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* SELETOR RÁPIDO DO TIPO DE CONTRATO */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700">Tipo de Contrato:</span>
            <div className="flex flex-wrap rounded-xl bg-slate-100 border border-slate-300 p-1 gap-1">
              <button
                type="button"
                id="btn-contract-a-vista"
                onClick={() => onChangeContractType('a_vista')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sale.tipoContrato === 'a_vista' || sale.tipoContrato === 'compra_venda_a_vista' || sale.tipoContrato === 'recibo_quitacao_a_vista' || sale.tipoContrato === 'recibo_quitacao'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                1. À vista
              </button>
              <button
                type="button"
                id="btn-contract-parcelado"
                onClick={() => onChangeContractType('parcelado')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sale.tipoContrato === 'parcelado' || sale.tipoContrato === 'compra_venda_parcelado'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                2. Parcelado
              </button>
              <button
                type="button"
                id="btn-contract-exclusividade"
                onClick={() => onChangeContractType('exclusividade')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sale.tipoContrato === 'exclusividade' || sale.tipoContrato === 'exclusividade_casas' || sale.tipoContrato === 'corretagem_cliente'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                3. Exclusividade
              </button>
            </div>
          </div>

          {sale.financial.tipoPagamento === 'parcelado' && (
            <button
              type="button"
              onClick={() => setShowParcelasModal(!showParcelasModal)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-mono font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{showParcelasModal ? 'Ocultar Cronograma' : `Ver Carnê de ${sale.financial.quantidadeParcelas} Parcelas`}</span>
            </button>
          )}
        </div>
      </div>

      {/* MÓDULO COMPLETO DE ASSINATURA DIGITAL */}
      <DigitalSignatureArea
        sale={sale}
        companyConfig={companyConfig}
        onDownloadOriginalPdf={handlePrint}
        onOpenPublicSignModal={onOpenPublicSignModal}
        onOpenValidationModal={onOpenValidationModal}
      />

      {/* CRONOGRAMA DE PARCELAS / CARNÊ EXPANSÍVEL */}
      {showParcelasModal && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-slate-200 no-print space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-sm">Cronograma Geral de Parcelas do Lote</h3>
              <p className="text-xs text-slate-500 font-mono">
                {sale.financial.quantidadeParcelas} parcelas mensais de {formatCurrency(sale.financial.valorParcela)} com reajuste pelo {sale.financial.indiceReajuste}
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-lg">
              Total Financiado: {formatCurrency(sale.financial.valorTotal - sale.financial.entrada)}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Parcela</th>
                  <th className="px-4 py-2.5">Vencimento</th>
                  <th className="px-4 py-2.5">Valor Nominal</th>
                  <th className="px-4 py-2.5">Saldo Devedor</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {parcelas.map((p) => (
                  <tr key={p.numero} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-bold text-slate-800">#{p.numero.toString().padStart(3, '0')}</td>
                    <td className="px-4 py-2 text-slate-600">{p.dataVencimento}</td>
                    <td className="px-4 py-2 font-bold text-slate-900">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-2 text-slate-500">{formatCurrency(p.saldoRestante)}</td>
                    <td className="px-4 py-2 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        A Vencer
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOLHA DO CONTRATO FORMATADA PROFISSIONALMENTE (ESTILO A4) */}
      <div 
        id="contract-print-area"
        className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-8 sm:p-12 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0"
      >
        <div 
          dangerouslySetInnerHTML={{ __html: contractHTML }} 
        />
      </div>
    </div>
  );
};
