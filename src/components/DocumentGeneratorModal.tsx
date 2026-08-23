import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  ChevronRight,
  Layers,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Check
} from 'lucide-react';
import { DocumentTemplate, SaleRecord, TipoModeloDocumento } from '../types';
import { generateFilledDocx } from '../utils/docxProcessor';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { DigitalSignatureArea } from './DigitalSignatureArea';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: DocumentTemplate[];
  sales: SaleRecord[];
  initialTemplate?: DocumentTemplate | null;
  initialSale?: SaleRecord | null;
  initialMode?: 'a_vista' | 'parcelado';
}

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({
  isOpen,
  onClose,
  templates,
  sales,
  initialTemplate,
  initialSale,
  initialMode,
}) => {
  // 1. Tipo da Venda selecionado (À vista vs Parcelada)
  const [tipoVendaFilter, setTipoVendaFilter] = useState<'a_vista' | 'parcelado'>(initialMode || 'a_vista');
  
  // 2. Venda Selecionada
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  
  // 3. Modelo Selecionado
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // 4. Estado do documento gerado
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDoc, setGeneratedDoc] = useState<{
    docxBlob: Blob | null;
    fileName: string;
    filledHtml: string;
  } | null>(null);

  // Documento secundário quando gerando ambos
  const [secondaryDoc, setSecondaryDoc] = useState<{
    docxBlob: Blob | null;
    fileName: string;
    filledHtml: string;
    title: string;
  } | null>(null);

  // 5. Aba de exibição do resultado: 'preview' ou 'details'
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');

  // Ref do container para impressão
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Inicialização inteligente quando abre o modal
  useEffect(() => {
    if (!isOpen) {
      setGeneratedDoc(null);
      setSecondaryDoc(null);
      return;
    }

    if (initialSale) {
      setSelectedSaleId(initialSale.id);
      const isParcelado = initialSale.financial.tipoPagamento === 'parcelado' && (initialSale.financial.quantidadeParcelas > 1);
      if (initialMode) {
        setTipoVendaFilter(initialMode);
      } else {
        setTipoVendaFilter(isParcelado ? 'parcelado' : 'a_vista');
      }
    } else if (sales.length > 0 && !selectedSaleId) {
      setSelectedSaleId(sales[0].id);
      const isParcelado = sales[0].financial.tipoPagamento === 'parcelado' && (sales[0].financial.quantidadeParcelas > 1);
      if (initialMode) {
        setTipoVendaFilter(initialMode);
      } else {
        setTipoVendaFilter(isParcelado ? 'parcelado' : 'a_vista');
      }
    }

    if (initialTemplate) {
      setSelectedTemplateId(initialTemplate.id);
      if (!initialMode) {
        if (initialTemplate.tipoDocumento === 'venda_parcelada') {
          setTipoVendaFilter('parcelado');
        } else if (initialTemplate.tipoDocumento === 'venda_a_vista' || initialTemplate.tipoDocumento === 'recibo') {
          setTipoVendaFilter('a_vista');
        }
      }
    }
  }, [isOpen, initialTemplate, initialSale, sales, initialMode]);

  // Venda atualmente selecionada
  const currentSale = sales.find(s => s.id === selectedSaleId) || sales[0] || null;

  // Verifica se a venda possui parcelamento
  const saleHasParcelas = currentSale 
    ? (currentSale.financial.quantidadeParcelas > 1 && 
       (currentSale.financial.valorTotal - currentSale.financial.entrada > 0) &&
       currentSale.financial.tipoPagamento !== 'a_vista')
    : false;

  // Se a venda NÃO tiver parcelas, força 'a_vista'
  useEffect(() => {
    if (currentSale && !saleHasParcelas && tipoVendaFilter === 'parcelado') {
      setTipoVendaFilter('a_vista');
    }
  }, [currentSale, saleHasParcelas]);

  // Filtra os modelos de acordo com o tipo da venda
  const availableTemplates = templates.filter(tpl => {
    if (tipoVendaFilter === 'a_vista') {
      return tpl.tipoDocumento === 'recibo_quitacao' ||
             tpl.tipoDocumento === 'venda_a_vista' || 
             tpl.tipoDocumento === 'recibo' || 
             tpl.tipoDocumento === 'terreno_a_vista' ||
             tpl.tipoDocumento === 'exclusividade_casas' ||
             tpl.tipoDocumento === 'outro';
    } else {
      return tpl.tipoDocumento === 'compromisso_parcelado' ||
             tpl.tipoDocumento === 'venda_parcelada' || 
             tpl.tipoDocumento === 'terreno_parcelado' ||
             tpl.tipoDocumento === 'contrato' || 
             tpl.tipoDocumento === 'exclusividade_casas' ||
             tpl.tipoDocumento === 'outro';
    }
  });

  // Atualiza modelo selecionado quando o filtro de tipo muda
  useEffect(() => {
    if (availableTemplates.length > 0) {
      const match = availableTemplates.find(t => t.id === selectedTemplateId);
      if (!match) {
        setSelectedTemplateId(availableTemplates[0].id);
      }
    }
  }, [tipoVendaFilter, templates]);

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || availableTemplates[0] || null;

  // Disparar preenchimento automático gerando uma nova cópia intacta
  const handleGenerateDocument = async () => {
    if (!currentSale || !currentTemplate) {
      alert('Selecione uma venda e um modelo de documento.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateFilledDocx(currentTemplate, currentSale);
      setGeneratedDoc(result);
      setSecondaryDoc(null);
      setActiveTab('preview');
    } catch (err) {
      console.error('Erro ao gerar documento preenchido:', err);
      alert('Houve um erro ao preencher o documento Word.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Disparar preenchimento dos dois modelos (Parcelado + À Vista) quando houver parcelas
  const handleGenerateBothDocuments = async () => {
    if (!currentSale) {
      alert('Selecione uma venda.');
      return;
    }

    setIsGenerating(true);
    try {
      const parceladoTpl = templates.find(t => t.tipoDocumento === 'compromisso_parcelado' || t.tipoDocumento === 'venda_parcelada' || t.tipoDocumento === 'terreno_parcelado') || templates[1] || currentTemplate;
      const aVistaTpl = templates.find(t => t.tipoDocumento === 'recibo_quitacao' || t.tipoDocumento === 'venda_a_vista' || t.tipoDocumento === 'recibo' || t.tipoDocumento === 'terreno_a_vista') || templates[0] || currentTemplate;

      if (parceladoTpl && aVistaTpl) {
        const docParcelado = await generateFilledDocx(parceladoTpl, currentSale);
        const docAVista = await generateFilledDocx(aVistaTpl, currentSale);
        
        setGeneratedDoc(docParcelado);
        setSecondaryDoc({
          docxBlob: docAVista.docxBlob,
          fileName: docAVista.fileName,
          filledHtml: docAVista.filledHtml,
          title: 'Recibo de Quitação (À Vista)'
        });
        setActiveTab('preview');
      }
    } catch (err) {
      console.error('Erro ao gerar ambos os documentos:', err);
      alert('Houve um erro ao gerar os documentos.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. Ação Obrigatória: [ BAIXAR DOCX ]
  const handleDownloadDocx = (blob?: Blob | null, name?: string) => {
    const targetBlob = blob || generatedDoc?.docxBlob;
    const targetName = name || generatedDoc?.fileName;
    if (!targetBlob || !targetName) return;

    const url = URL.createObjectURL(targetBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 2. Ação Obrigatória: [ BAIXAR PDF ]
  const handleDownloadPdf = (htmlContent?: string, name?: string) => {
    const targetHtml = htmlContent || generatedDoc?.filledHtml;
    const targetName = name || generatedDoc?.fileName || 'CONTRATO';
    if (!targetHtml) return;

    // Criar janela limpa para impressão / salvar como PDF com estilo A4
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permita pop-ups no seu navegador para exportar o PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${targetName.replace(/\.docx$/i, '')}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm 15mm 20mm 15mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #111;
              background-color: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            p { margin-bottom: 1em; text-align: justify; }
            h1, h2, h3, h4 { font-weight: bold; color: #000; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #333; padding: 8px; font-size: 10pt; }
            .signature-block { page-break-inside: avoid; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="document-body">
            ${targetHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 3. Imprimir diretamente
  const handlePrint = () => {
    handleDownloadPdf();
  };

  // 4. Compartilhar resumo no WhatsApp
  const handleShareWhatsApp = () => {
    if (!currentSale) return;
    const msg = `*DOCUMENTO GERADO COM SUCESSO*\n` +
      `Modelo: ${currentTemplate?.nome}\n` +
      `Cliente: ${currentSale.buyer.nome} (CPF: ${currentSale.buyer.cpf})\n` +
      `Imóvel: Lote ${currentSale.property.lote}, Quadra ${currentSale.property.quadra} - ${currentSale.property.empreendimento}\n` +
      `Valor: ${formatCurrency(currentSale.financial.valorTotal)}\n` +
      `Arquivo gerado: ${generatedDoc?.fileName || 'Documento.docx'}`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full my-6 flex flex-col max-h-[92vh]">
        
        {/* Header do Gerador */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gerador Universal de Documentos Word e PDF
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Criação de nova cópia preenchida automaticamente a partir do modelo Word original.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Seção 1: Seleção e Filtros (Tipo de Venda + Venda Cadastrada + Modelo) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Passo A: Tipo da Venda (Radio Buttons com inteligência de parcelas) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Tipo da venda:
                  </label>
                  {!saleHasParcelas && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded">
                      À Vista (Sem parcelas)
                    </span>
                  )}
                  {saleHasParcelas && (
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-semibold px-1.5 py-0.5 rounded">
                      {currentSale?.financial.quantidadeParcelas}x Parcelas
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-2.5">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoVenda"
                      value="a_vista"
                      checked={tipoVendaFilter === 'a_vista'}
                      onChange={() => setTipoVendaFilter('a_vista')}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-emerald-900">À vista</span>
                  </label>

                  <label className={`flex items-center space-x-2 text-xs font-bold ${!saleHasParcelas ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-800 cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="tipoVenda"
                      value="parcelado"
                      disabled={!saleHasParcelas}
                      checked={tipoVendaFilter === 'parcelado'}
                      onChange={() => {
                        if (saleHasParcelas) setTipoVendaFilter('parcelado');
                      }}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className={!saleHasParcelas ? 'line-through decoration-slate-400' : 'text-blue-900'}>
                      Parcelada
                    </span>
                  </label>
                </div>
              </div>

              {/* Passo B: Venda Cadastrada */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Venda Cadastrada / Cliente:
                </label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => {
                    setSelectedSaleId(e.target.value);
                    const s = sales.find(x => x.id === e.target.value);
                    if (s) {
                      const hasP = s.financial.quantidadeParcelas > 1 && (s.financial.valorTotal - s.financial.entrada > 0) && s.financial.tipoPagamento !== 'a_vista';
                      setTipoVendaFilter(hasP ? 'parcelado' : 'a_vista');
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.buyer.nome} ({s.codigoVenda}) — {formatCurrency(s.financial.valorTotal)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Passo C: Modelo Word Disponível */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Modelo Word Disponível:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {availableTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      📄 {t.nome} ({t.fileName})
                    </option>
                  ))}
                  {availableTemplates.length === 0 && (
                    <option value="">Nenhum modelo cadastrado nesta categoria</option>
                  )}
                </select>
              </div>

            </div>

            {/* Informações Rápidas da Venda e Botões de Gerar */}
            {currentSale && (
              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5 text-slate-600">
                  <span className="flex items-center space-x-1 font-semibold text-slate-800">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    <span>{currentSale.buyer.nome}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    <span>Lote {currentSale.property.lote}, Q. {currentSale.property.quadra} ({currentSale.property.empreendimento})</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1 font-bold text-emerald-700">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{formatCurrency(currentSale.financial.valorTotal)}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  {saleHasParcelas && (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateBothDocuments}
                      className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                      title="Gera o Contrato Parcelado e o Contrato À Vista simultaneamente"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>GERAR OS 2 MODELOS</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isGenerating || !currentTemplate}
                    onClick={handleGenerateDocument}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGenerating ? 'Preenchendo...' : `GERAR (${tipoVendaFilter === 'a_vista' ? 'À VISTA' : 'PARCELADO'})`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Documento Gerado & Exportação Obrigatória */}
          {generatedDoc && (
            <div className="space-y-4">
              
              {/* Barra de Ações e Exportações Obrigatórias (Documento Principal) */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      {secondaryDoc ? 'Contrato Principal (Parcelado) Preenchido!' : 'Documento Preenchido com Sucesso!'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-mono mt-0.5">
                    Arquivo: <strong className="text-slate-900">{generatedDoc.fileName}</strong>
                  </p>
                </div>

                {/* Botões Obrigatórios: [ BAIXAR DOCX ] e [ BAIXAR PDF ] + Visualizar e Imprimir */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(generatedDoc.docxBlob, generatedDoc.fileName)}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>[ BAIXAR DOCX ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(generatedDoc.filledHtml, generatedDoc.fileName)}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>[ BAIXAR PDF ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Imprimir</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center space-x-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-emerald-700" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Seção do Segundo Documento (quando gerado ambos) */}
              {secondaryDoc && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-950">
                        {secondaryDoc.title} Preenchido com Sucesso!
                      </span>
                    </div>
                    <p className="text-xs text-blue-800 font-mono mt-0.5">
                      Arquivo: <strong className="text-slate-900">{secondaryDoc.fileName}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocx(secondaryDoc.docxBlob, secondaryDoc.fileName)}
                      className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>[ BAIXAR DOCX À VISTA ]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(secondaryDoc.filledHtml, secondaryDoc.fileName)}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>[ BAIXAR PDF À VISTA ]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Módulo de Assinatura Digital do Documento Gerado */}
              {currentSale && (
                <DigitalSignatureArea
                  sale={currentSale}
                  companyConfig={{
                    nomeFantasia: 'IMOB GESTÃO IMOBILIÁRIA',
                    razaoSocial: 'IMOB GESTÃO EMPREENDIMENTOS LTDA',
                    cnpj: '12.345.678/0001-90',
                    creci: '12345-J',
                    endereco: 'Av. Paulista, 1000, Cj 101 - Bela Vista, São Paulo/SP',
                    telefone: '(11) 98765-4321',
                    email: 'contato@imobgestao.com.br'
                  }}
                  customDocumentHtml={generatedDoc.filledHtml}
                  docxFileName={generatedDoc.fileName}
                  onDownloadOriginalDocx={() => handleDownloadDocx(generatedDoc.docxBlob, generatedDoc.fileName)}
                  onDownloadOriginalPdf={() => handleDownloadPdf(generatedDoc.filledHtml, generatedDoc.fileName)}
                />
              )}

              {/* Pré-visualização Fiel do Documento Preenchido */}
              <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 overflow-x-auto shadow-inner">
                <div 
                  ref={printableAreaRef}
                  className="bg-white shadow-lg rounded-lg p-10 mx-auto max-w-3xl min-h-[600px] text-slate-900 font-serif leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: generatedDoc.filledHtml }}
                />
              </div>

            </div>
          )}

          {!generatedDoc && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Pronto para gerar o documento
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Selecione o tipo de venda (À vista ou Parcelada), a venda cadastrada e o modelo Word desejado. O sistema criará uma nova cópia preenchida com valores monetários e numéricos por extenso.
              </p>
              <button
                type="button"
                onClick={handleGenerateDocument}
                disabled={isGenerating || !currentSale || !currentTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-sm inline-flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>GERAR DOCUMENTO AGORA</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600 font-mono">
            {currentTemplate ? `Modelo: ${currentTemplate.nome}` : 'Nenhum modelo'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
