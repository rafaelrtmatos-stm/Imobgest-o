import React, { useState, useEffect } from 'react';
import { 
  Link, 
  Send, 
  Clock, 
  Copy, 
  Check, 
  CheckCircle2, 
  Eye, 
  Download, 
  RefreshCw, 
  Share2, 
  User, 
  Building, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  ExternalLink, 
  ChevronRight, 
  Calendar, 
  MessageSquare, 
  Lock, 
  KeyRound, 
  X,
  History,
  Trash2,
  FileCheck
} from 'lucide-react';
import { 
  ExclusivityFillLink, 
  ExclusivityValidityOption, 
  ExclusivityLinkStatus,
  ExclusivityLinkHistoryEvent 
} from '../types/exclusivityLink';
import { ContratoModularFormData } from '../types/modularContract';
import { 
  createExclusivityLink, 
  getAllExclusivityLinks, 
  buildExclusivityClientUrl, 
  generateExclusivityInviteMessage, 
  recordExclusivityEvent,
  maskCpfPrivacy,
  saveAllExclusivityLinks
} from '../utils/exclusivityLinkService';
import { 
  generateModularContractHtml, 
  generateModularDocxBlob 
} from '../utils/modularDocxProcessor';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExclusivityLinkManagerProps {
  currentFormData: ContratoModularFormData;
  onSelectContractForEditor?: (formData: ContratoModularFormData) => void;
  onOpenClientView?: (token: string) => void;
}

export const ExclusivityLinkManager: React.FC<ExclusivityLinkManagerProps> = ({
  currentFormData,
  onSelectContractForEditor,
  onOpenClientView,
}) => {
  // Lista de links gerados
  const [links, setLinks] = useState<ExclusivityFillLink[]>(() => getAllExclusivityLinks());

  // Configurações para Novo Link
  const [validityOption, setValidityOption] = useState<ExclusivityValidityOption>('24h');
  const [customHours, setCustomHours] = useState<number>(48);
  const [allowClientEditImovel, setAllowClientEditImovel] = useState<boolean>(false);
  const [allowClientEditExclusividade, setAllowClientEditExclusividade] = useState<boolean>(false);
  const [clientNameInput, setClientNameInput] = useState<string>(currentFormData.contratante.nome || '');
  const [clientPhoneInput, setClientPhoneInput] = useState<string>(currentFormData.contratante.telefone || '');

  // Mensagem personalizável
  const [customMessageTemplate, setCustomMessageTemplate] = useState<string>(
`Olá, [NOME].

Precisamos dos seus dados para preparar o contrato de exclusividade do imóvel.

Clique no link abaixo e preencha os dados solicitados.

LINK:
[LINK]

Após preencher, confira as informações e clique em OK.

Depois disso, o sistema apresentará o contrato para leitura e assinatura.`
  );

  // Estados de feedback
  const [generatedLink, setGeneratedLink] = useState<ExclusivityFillLink | null>(null);
  const [copiedLinkToken, setCopiedLinkToken] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de Histórico de Auditoria
  const [viewHistoryLink, setViewHistoryLink] = useState<ExclusivityFillLink | null>(null);
  
  // Download states
  const [downloadingToken, setDownloadingToken] = useState<string | null>(null);

  // Sincronização automática com eventos de armazenamento
  useEffect(() => {
    const handleUpdate = () => {
      setLinks(getAllExclusivityLinks());
    };
    window.addEventListener('exclusivity_links_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('exclusivity_links_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Gerar Novo Link
  const handleGenerateLink = () => {
    const updatedFormData: ContratoModularFormData = {
      ...currentFormData,
      contratante: {
        ...currentFormData.contratante,
        nome: clientNameInput.trim() || currentFormData.contratante.nome,
        telefone: clientPhoneInput.trim() || currentFormData.contratante.telefone,
      }
    };

    const newLink = createExclusivityLink({
      initialFormData: updatedFormData,
      validityConfig: validityOption,
      customHours: Number(customHours) || 24,
      allowClientEditImovel,
      allowClientEditExclusividade,
      customMessage: customMessageTemplate,
    });

    setGeneratedLink(newLink);
    setLinks(getAllExclusivityLinks());
    showToast('Link exclusivo gerado com sucesso!');
  };

  // Copiar URL do Link
  const handleCopyLinkUrl = (token: string) => {
    const url = buildExclusivityClientUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedLinkToken(token);
    showToast('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLinkToken(null), 2500);
  };

  // Copiar Mensagem Formatada
  const handleCopyMessage = (link: ExclusivityFillLink) => {
    const clientName = link.clientFilledData?.contratante.nome || link.initialData.contratante.nome || clientNameInput || 'Cliente';
    const linkUrl = buildExclusivityClientUrl(link.token);
    const message = generateExclusivityInviteMessage(clientName, linkUrl, link.customMessage || customMessageTemplate);
    
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    showToast('Mensagem formatada copiada!');
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Enviar Mensagem via WhatsApp
  const handleSendWhatsApp = (link: ExclusivityFillLink) => {
    const clientName = link.clientFilledData?.contratante.nome || link.initialData.contratante.nome || clientNameInput || 'Cliente';
    const linkUrl = buildExclusivityClientUrl(link.token);
    const rawPhone = (link.clientFilledData?.contratante.telefone || link.initialData.contratante.telefone || clientPhoneInput || '').replace(/\D/g, '');
    const message = generateExclusivityInviteMessage(clientName, linkUrl, link.customMessage || customMessageTemplate);
    
    recordExclusivityEvent(
      link.token,
      'LINK_ENVIADO',
      `Link compartilhado via WhatsApp com o cliente ${clientName}.`
    );

    const whatsappUrl = rawPhone 
      ? `https://api.whatsapp.com/send?phone=55${rawPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  // Excluir Link
  const handleDeleteLink = (id: string) => {
    if (confirm('Tem certeza de que deseja remover este link de preenchimento?')) {
      const remaining = links.filter(l => l.id !== id);
      saveAllExclusivityLinks(remaining);
      setLinks(remaining);
      if (generatedLink?.id === id) setGeneratedLink(null);
      showToast('Link removido do histórico.');
    }
  };

  // Baixar DOCX
  const handleDownloadDocx = async (link: ExclusivityFillLink) => {
    setDownloadingToken(link.token);
    try {
      const formToUse = link.clientFilledData || link.initialData;
      const blob = await generateModularDocxBlob(undefined, formToUse);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrato_Exclusividade_${link.codigoContrato}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Arquivo DOCX baixado com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar DOCX:', e);
      alert('Erro ao gerar arquivo Word.');
    } finally {
      setDownloadingToken(null);
    }
  };

  // Baixar PDF
  const handleDownloadPdf = async (link: ExclusivityFillLink, isSigned: boolean = false) => {
    setDownloadingToken(link.token);
    try {
      const formToUse = link.clientFilledData || link.initialData;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.background = '#ffffff';
      container.style.padding = '40px';

      let html = generateModularContractHtml(formToUse);

      if (isSigned && link.signatureData) {
        html += `
          <div style="margin-top: 40px; padding: 20px; border: 2px solid #059669; border-radius: 10px; background: #ecfdf5; font-family: monospace; font-size: 11px; color: #065f46;">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #047857; text-transform: uppercase;">
              ✓ DOCUMENTO ASSINADO DIGITALMENTE
            </div>
            <div>Signatário: ${formToUse.contratante.nome} | CPF: ${maskCpfPrivacy(formToUse.contratante.cpf)}</div>
            <div>Corretor: ${link.corretor.nome} | CRECI: ${link.corretor.creci}</div>
            <div>Data e Hora: ${new Date(link.signatureData.signedAt || '').toLocaleString('pt-BR')}</div>
            <div>Código de Confirmação: ${link.signatureData.confirmationCode}</div>
            <div>Hash: ${link.signatureData.signatureHash}</div>
          </div>
        `;
      }

      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = isSigned 
        ? `Contrato_Exclusividade_ASSINADO_${link.codigoContrato}.pdf`
        : `Contrato_Exclusividade_${link.codigoContrato}.pdf`;

      doc.save(fileName);
      showToast('PDF baixado com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      alert('Erro ao gerar arquivo PDF.');
    } finally {
      setDownloadingToken(null);
    }
  };

  // Status visual badge
  const renderStatusBadge = (status: ExclusivityLinkStatus) => {
    switch (status) {
      case 'ASSINADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
          </span>
        );
      case 'AGUARDANDO_ASSINATURA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Aguardando Assinatura
          </span>
        );
      case 'PREENCHENDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider rounded-full border border-blue-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Em Preenchimento
          </span>
        );
      case 'EXPIRADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider rounded-full border border-rose-300">
            <Clock className="w-3.5 h-3.5" /> Link Expirado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-wider rounded-full border border-slate-300">
            <X className="w-3.5 h-3.5" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-wider rounded-full border border-purple-300">
            <Send className="w-3.5 h-3.5" /> Aguardando Preenchimento
          </span>
        );
    }
  };

  // Renderiza timeline do processo
  const renderProcessTimeline = (link: ExclusivityFillLink) => {
    const isCreated = true;
    const isSent = link.history.some(h => h.event === 'LINK_ENVIADO');
    const isStarted = link.history.some(h => h.event === 'CLIENTE_ACESSOU' || h.event === 'CLIENTE_INICIOU_PREENCHIMENTO');
    const isFilled = link.history.some(h => h.event === 'DADOS_PREENCHIDOS');
    const isConfirmed = link.history.some(h => h.event === 'CLIENTE_CONFIRMOU_DADOS');
    const isGenerated = link.history.some(h => h.event === 'CONTRATO_GERADO');
    const isViewed = link.history.some(h => h.event === 'CONTRATO_VISUALIZADO');
    const isSigning = link.history.some(h => h.event === 'CLIENTE_INICIOU_ASSINATURA' || h.event === 'CODIGO_CONFIRMADO');
    const isFinished = link.status === 'ASSINADO';

    const steps = [
      { label: 'Link criado', active: isCreated },
      { label: 'Link enviado', active: isSent },
      { label: 'Cliente acessou', active: isStarted },
      { label: 'Cliente preencheu dados', active: isFilled },
      { label: 'Cliente confirmou dados', active: isConfirmed },
      { label: 'Contrato gerado', active: isGenerated },
      { label: 'Cliente visualizou contrato', active: isViewed },
      { label: 'Cliente iniciou assinatura', active: isSigning },
      { label: 'Assinatura concluída', active: isFinished },
    ];

    return (
      <div className="space-y-2 py-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          STATUS DO PROCESSO
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className={`p-2 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                step.active 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                step.active ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-transparent'
              }`}>
                {step.active && '✓'}
              </div>
              <span className="truncate">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* BLOCO 1: GERADOR DE NOVO LINK DE EXCLUSIVIDADE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Link className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full mb-1">
                Exclusivo para Contrato de Exclusividade
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900">
                Gerar Link para o Cliente Preencher e Assinar
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Gere um link seguro com validade programada para o proprietário preencher seus dados, conferir as cláusulas e assinar digitalmente.
              </p>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE CONFIGURAÇÃO DO LINK */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUNA 1: IDENTIFICAÇÃO BÁSICA DO CLIENTE */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              1. Identificação Prévia (Opcional)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400">Usado para personalizar a saudação na mensagem</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp do Cliente
              </label>
              <input
                type="text"
                value={clientPhoneInput}
                onChange={(e) => setClientPhoneInput(e.target.value)}
                placeholder="(93) 99999-9999"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-900">Imóvel Configurado:</div>
              <div className="text-slate-600">{currentFormData.imovel.tipoImovel} - {currentFormData.imovel.endereco}</div>
              <div className="text-emerald-700 font-bold">
                {formatCurrency(currentFormData.precoCondicoes.precoVenda || currentFormData.exclusividade.precoAutorizadoVenda)} ({currentFormData.exclusividade.prazoDias || 90} dias)
              </div>
            </div>
          </div>

          {/* COLUNA 2: VALIDADE DO LINK & PERMISSÕES */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              2. Validade do Link e Regras
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Escolha a validade do link:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['30m', '1h', '2h', '24h', 'custom'] as ExclusivityValidityOption[]).map((opt) => {
                  const labels: Record<ExclusivityValidityOption, string> = {
                    '30m': '30 minutos',
                    '1h': '1 hora',
                    '2h': '2 horas',
                    '24h': '24 horas',
                    'custom': 'Personalizado',
                  };
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValidityOption(opt)}
                      className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        validityOption === opt
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {labels[opt]}
                    </button>
                  );
                })}
              </div>

              {validityOption === 'custom' && (
                <div className="mt-2.5">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Duração em horas:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customHours}
                    onChange={(e) => setCustomHours(Math.max(1, parseInt(e.target.value) || 24))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Permissão de alteração dos dados do imóvel */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={allowClientEditImovel}
                  onChange={(e) => setAllowClientEditImovel(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Permitir cliente alterar dados do imóvel
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                    Por padrão desmarcado: mantém os dados comerciais e cadastrais definidos pelo corretor como somente conferência.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* COLUNA 3: MENSAGEM PERSONALIZADA & BOTÃO GERAR */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              3. Mensagem Automática
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Texto do Convite (placeholders: [NOME], [LINK])
              </label>
              <textarea
                rows={5}
                value={customMessageTemplate}
                onChange={(e) => setCustomMessageTemplate(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-mono leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateLink}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
            >
              <Link className="w-4 h-4" />
              GERAR LINK EXCLUSIVO
            </button>
          </div>

        </div>

        {/* FEEDBACK DO LINK RECÉM-GERADO */}
        {generatedLink && (
          <div className="p-6 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase">Link Gerado com Sucesso!</div>
                  <div className="text-sm font-extrabold">{generatedLink.codigoContrato} • Validade até {new Date(generatedLink.expiresAt).toLocaleString('pt-BR')}</div>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-700/50 rounded-full text-xs font-mono text-emerald-300">
                Token Seguro: {generatedLink.token.substring(0, 10)}...
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={buildExclusivityClientUrl(generatedLink.token)}
                className="flex-1 px-4 py-2.5 bg-slate-800/90 text-slate-200 text-xs font-mono rounded-xl border border-slate-700 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => handleCopyLinkUrl(generatedLink.token)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLinkToken === generatedLink.token ? 'Copiado!' : 'COPIAR LINK'}
              </button>

              <button
                type="button"
                onClick={() => handleCopyMessage(generatedLink)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {copiedMessage ? 'Mensagem Copiada!' : 'COPIAR MENSAGEM'}
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(generatedLink)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                WHATSAPP
              </button>

              {onOpenClientView && (
                <button
                  type="button"
                  onClick={() => onOpenClientView(generatedLink.token)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="Abrir a tela exatamente como o cliente verá no celular"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  TESTAR COMO CLIENTE
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* BLOCO 2: PAINEL DO CORRETOR (ACOMPANHAMENTO EM TEMPO REAL DOS LINKS) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Painel do Corretor • Links de Exclusividade
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhe em tempo real o status de preenchimento, conferência e assinatura de cada link enviado.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total de links: {links.length}
          </div>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
            <Link className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Nenhum link gerado ainda</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utilize o formulário acima para gerar o primeiro link seguro de preenchimento para o cliente.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {links.map((link) => {
              const displayClientName = link.clientFilledData?.contratante.nome || link.initialData.contratante.nome || 'Proprietário / Cliente';
              const displayImovel = `${link.initialData.imovel.tipoImovel} - ${link.initialData.imovel.endereco}`;
              const displayPreco = formatCurrency(link.initialData.precoCondicoes.precoVenda || link.initialData.exclusividade.precoAutorizadoVenda);
              const isSigned = link.status === 'ASSINADO';

              return (
                <div 
                  key={link.id}
                  className={`border rounded-3xl p-5 sm:p-6 transition-all space-y-4 ${
                    isSigned 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* CABEÇALHO DO ITEM */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-xs ${
                        isSigned ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isSigned ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            {link.codigoContrato}
                          </span>
                          {renderStatusBadge(link.status)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Cliente: <strong className="text-slate-800">{displayClientName}</strong> • Criado em {new Date(link.createdAt).toLocaleDateString('pt-BR')} às {new Date(link.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-right text-slate-500">
                      <div>Imóvel: <strong className="text-slate-800">{displayImovel}</strong></div>
                      <div className="text-emerald-700 font-bold">{displayPreco} ({link.initialData.exclusividade.prazoDias || 90} dias)</div>
                    </div>
                  </div>

                  {/* STATUS DO PROCESSO TIMELINE */}
                  {renderProcessTimeline(link)}

                  {/* AÇÕES DISPONÍVEIS CONFORME ESPECIFICAÇÃO */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocx(link)}
                      disabled={downloadingToken === link.token}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      BAIXAR DOCX
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(link, false)}
                      disabled={downloadingToken === link.token}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600" />
                      BAIXAR PDF
                    </button>

                    {isSigned && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(link, true)}
                        disabled={downloadingToken === link.token}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        BAIXAR PDF ASSINADO
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyLinkUrl(link.token)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      COPIAR LINK
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(link)}
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      ENVIAR NOVAMENTE
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewHistoryLink(link)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      VER HISTÓRICO ({link.history.length})
                    </button>

                    {onOpenClientView && (
                      <button
                        type="button"
                        onClick={() => onOpenClientView(link.token)}
                        className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        VER COMO CLIENTE
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 cursor-pointer ml-auto transition-colors"
                      title="Excluir link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE HISTÓRICO DE AUDITORIA COMPLETO */}
      {viewHistoryLink && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Histórico de Auditoria • {viewHistoryLink.codigoContrato}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registro cronológico completo de todos os acessos, preenchimentos e validações.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewHistoryLink(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {viewHistoryLink.history.map((evt, idx) => (
                <div 
                  key={evt.id || idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-800 font-bold">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {evt.event.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(evt.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-slate-700 leading-relaxed">
                    {evt.description}
                  </div>
                  {evt.ip && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Origem: {evt.ip} {evt.userAgent ? `• ${evt.userAgent.substring(0, 40)}...` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setViewHistoryLink(null)}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
