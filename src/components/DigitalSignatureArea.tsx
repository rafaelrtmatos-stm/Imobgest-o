import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  PenTool, 
  Send, 
  MessageSquare, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  Download, 
  History, 
  ExternalLink, 
  FileText,
  UserCheck,
  Users,
  QrCode,
  Share2,
  RefreshCw
} from 'lucide-react';
import { 
  ContratoAssinaturaDigital, 
  ParteAssinante, 
  StatusAssinaturaContrato, 
  TipoFluxoAssinatura 
} from '../types/digitalSignature';
import { CompanyConfig, SaleRecord } from '../types';
import { 
  createOrGetDigitalContract, 
  downloadSignedContractPdf, 
  maskCpf, 
  updateContractFluxo 
} from '../utils/digitalSignatureService';
import { DigitalSignatureFlowModal } from './DigitalSignatureFlowModal';
import { SignatureAuditTimelineModal } from './SignatureAuditTimelineModal';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';

interface DigitalSignatureAreaProps {
  sale: SaleRecord;
  companyConfig: CompanyConfig;
  customDocumentHtml?: string;
  docxFileName?: string;
  onDownloadOriginalPdf?: () => void;
  onDownloadOriginalDocx?: () => void;
  onOpenPublicSignModal?: (token: string) => void;
  onOpenValidationModal?: (validationToken: string) => void;
}

export const DigitalSignatureArea: React.FC<DigitalSignatureAreaProps> = ({
  sale,
  companyConfig,
  customDocumentHtml,
  docxFileName,
  onDownloadOriginalPdf,
  onDownloadOriginalDocx,
  onOpenPublicSignModal,
  onOpenValidationModal,
}) => {
  const [contract, setContract] = useState<ContratoAssinaturaDigital | null>(null);
  const [isSignFlowOpen, setIsSignFlowOpen] = useState(false);
  const [targetPartyId, setTargetPartyId] = useState<string | undefined>(undefined);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // Inicializa ou carrega contrato digital
  useEffect(() => {
    let isMounted = true;
    createOrGetDigitalContract(sale, companyConfig, customDocumentHtml, docxFileName).then(c => {
      if (isMounted) {
        setContract(c);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [sale, companyConfig, customDocumentHtml, docxFileName]);

  if (!contract) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 animate-pulse font-mono">
        Carregando módulo de Assinatura Digital...
      </div>
    );
  }

  const parte1 = contract.partes[0];
  const parte2 = contract.partes[1];
  const isFullySigned = contract.status === 'assinado_por_todas_as_partes';

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const secondPartyLink = parte2 ? `${appOrigin}/assinar/${parte2.tokenAssinatura}` : '';

  const handleFluxoChange = (novoFluxo: TipoFluxoAssinatura) => {
    const updated = updateContractFluxo(contract.id, novoFluxo);
    if (updated) {
      setContract({ ...updated });
    }
  };

  const handleOpenSignForParty1 = () => {
    setTargetPartyId(parte1?.id);
    setIsSignFlowOpen(true);
  };

  const handleOpenSignForParty2 = () => {
    if (!parte2) return;
    setTargetPartyId(parte2.id);
    setIsSignFlowOpen(true);
  };

  const handleCopySecondPartyLink = () => {
    if (secondPartyLink) {
      navigator.clipboard.writeText(secondPartyLink);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!parte2) return;
    const msg = `Olá *${parte2.nome}*, seu contrato imobiliário (*${contract.titulo}*) está pronto para assinatura digital segura.\n\nAcesse o link exclusivo:\n${secondPartyLink}`;
    const cleanPhone = parte2.telefone.replace(/\D/g, '');
    const url = cleanPhone.length >= 10 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: StatusAssinaturaContrato) => {
    switch (status) {
      case 'assinado_por_todas_as_partes':
        return (
          <span className="bg-emerald-50 text-emerald-800 border-2 border-emerald-400 text-xs font-extrabold px-3 py-1 rounded-xl flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            ASSINADO POR TODAS AS PARTES
          </span>
        );
      case 'aguardando_segunda_parte':
        return (
          <span className="bg-blue-50 text-blue-800 border-2 border-blue-400 text-xs font-extrabold px-3 py-1 rounded-xl flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-blue-600" />
            AGUARDANDO SEGUNDA PARTE
          </span>
        );
      case 'assinado_parcialmente':
        return (
          <span className="bg-amber-50 text-amber-800 border-2 border-amber-400 text-xs font-extrabold px-3 py-1 rounded-xl flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
            ASSINADO PARCIALMENTE
          </span>
        );
      case 'assinatura_em_andamento':
        return (
          <span className="bg-indigo-50 text-indigo-800 border-2 border-indigo-400 text-xs font-extrabold px-3 py-1 rounded-xl flex items-center">
            <RefreshCw className="w-4 h-4 mr-1.5 text-indigo-600" />
            ASSINATURA EM ANDAMENTO
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-extrabold px-3 py-1 rounded-xl flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-slate-500" />
            AGUARDANDO ASSINATURA
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm space-y-6 no-print">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                Módulo Jurídico & Criptográfico
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded">
                {contract.contractVersionId}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900">
              ASSINATURA DIGITAL
            </h2>
          </div>
        </div>

        <div>
          {getStatusBadge(contract.status)}
        </div>
      </div>

      {/* SELEÇÃO DAS OPÇÕES DE ASSINATURA (ITEM 1) */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
          Modalidade de Assinatura:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          
          <button
            type="button"
            onClick={() => handleFluxoChange('somente_uma_parte')}
            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
              contract.fluxo === 'somente_uma_parte'
                ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 text-slate-700'
            }`}
          >
            <span className="font-extrabold flex items-center space-x-1.5">
              <span>1.</span>
              <span>SOMENTE UMA PARTE ASSINA</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans font-normal leading-tight">
              Assinatura única imediata (ex: corretor ou cliente exclusivo)
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleFluxoChange('eu_assino_e_envio')}
            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
              contract.fluxo === 'eu_assino_e_envio'
                ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 text-slate-700'
            }`}
          >
            <span className="font-extrabold flex items-center space-x-1.5">
              <span>2.</span>
              <span>EU ASSINO E ENVIO</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans font-normal leading-tight">
              Você assina primeiro e o sistema gera link para a outra parte
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleFluxoChange('outra_parte_primeiro')}
            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
              contract.fluxo === 'outra_parte_primeiro'
                ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 text-slate-700'
            }`}
          >
            <span className="font-extrabold flex items-center space-x-1.5">
              <span>3.</span>
              <span>OUTRA PARTE ASSINA PRIMEIRO</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans font-normal leading-tight">
              Envia primeiro ao comprador e retorna para você finalizar
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleFluxoChange('duas_partes_simultaneo')}
            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
              contract.fluxo === 'duas_partes_simultaneo'
                ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 text-slate-700'
            }`}
          >
            <span className="font-extrabold flex items-center space-x-1.5">
              <span>4.</span>
              <span>DUAS PARTES ASSINAM</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans font-normal leading-tight">
              Links independentes emitidos para ambas as partes simultaneamente
            </span>
          </button>
        </div>
      </div>

      {/* PAINEL DE STATUS DAS PARTES (ITEM 21) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        
        {/* PARTE 1 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              Parte 1: {parte1?.label || 'Vendedor'}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
              parte1?.status === 'assinado' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {parte1?.status === 'assinado' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ✓ Assinado
                </>
              ) : (
                '○ Aguardando'
              )}
            </span>
          </div>
          <div className="font-bold text-slate-900 text-sm">{parte1?.nome}</div>
          <div className="text-xs text-slate-600 font-mono">CPF/Doc: {maskCpf(parte1?.cpf || '')}</div>
          {parte1?.signedAt && (
            <div className="text-[11px] text-emerald-700 font-mono pt-1">
              Assinado em {new Date(parte1.signedAt).toLocaleString('pt-BR')}
            </div>
          )}
        </div>

        {/* PARTE 2 */}
        {parte2 && contract.fluxo !== 'somente_uma_parte' && (
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                Parte 2: {parte2.label}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                parte2.status === 'assinado' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {parte2.status === 'assinado' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ✓ Assinado
                  </>
                ) : (
                  '○ Aguardando'
                )}
              </span>
            </div>
            <div className="font-bold text-slate-900 text-sm">{parte2.nome}</div>
            <div className="text-xs text-slate-600 font-mono">CPF: {maskCpf(parte2.cpf)}</div>
            {parte2.signedAt && (
              <div className="text-[11px] text-emerald-700 font-mono pt-1">
                Assinado em {new Date(parte2.signedAt).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTÕES DE AÇÃO DO FLUXO (ITEM 21) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* BOTÕES DE ASSINATURA CONFORME O FLUXO */}
          {contract.fluxo === 'somente_uma_parte' && (
            <button
              type="button"
              onClick={handleOpenSignForParty1}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95 border border-emerald-600"
            >
              <PenTool className="w-4 h-4" />
              <span>ASSINAR DOCUMENTO</span>
            </button>
          )}

          {contract.fluxo === 'eu_assino_e_envio' && (
            <button
              type="button"
              onClick={handleOpenSignForParty1}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95 border border-emerald-600"
            >
              <PenTool className="w-4 h-4" />
              <span>ASSINAR E ENVIAR PARA OUTRA PARTE</span>
            </button>
          )}

          {contract.fluxo === 'outra_parte_primeiro' && (
            <>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95 border border-emerald-600"
              >
                <Send className="w-4 h-4" />
                <span>ENVIAR PARA OUTRA PARTE ASSINAR</span>
              </button>

              {parte2?.status === 'assinado' && (
                <button
                  type="button"
                  onClick={handleOpenSignForParty1}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  <PenTool className="w-4 h-4" />
                  <span>ASSINAR MINHA PARTE E FINALIZAR</span>
                </button>
              )}
            </>
          )}

          {contract.fluxo === 'duas_partes_simultaneo' && (
            <>
              <button
                type="button"
                onClick={handleOpenSignForParty1}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <PenTool className="w-4 h-4" />
                <span>ASSINAR PARTE 1</span>
              </button>

              {onOpenPublicSignModal && parte2 && (
                <button
                  type="button"
                  onClick={() => onOpenPublicSignModal(parte2.tokenAssinatura)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  <PenTool className="w-4 h-4" />
                  <span>ASSINAR PARTE 2</span>
                </button>
              )}
            </>
          )}

          {/* COMPARTILHAMENTO DE LINK DA 2ª PARTE */}
          {parte2 && (
            <>
              <button
                type="button"
                onClick={handleCopySecondPartyLink}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                title="Copiar Link de Assinatura da Outra Parte"
              >
                {isCopiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{isCopiedLink ? 'LINK COPIADO!' : 'COPIAR LINK'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                title="Enviar por WhatsApp"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>ENVIAR WHATSAPP</span>
              </button>
            </>
          )}

          {/* DOWNLOADS ORIGINAIS (MANTIDOS) */}
          {onDownloadOriginalPdf && (
            <button
              type="button"
              onClick={onDownloadOriginalPdf}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>BAIXAR PDF</span>
            </button>
          )}

          {onDownloadOriginalDocx && (
            <button
              type="button"
              onClick={onDownloadOriginalDocx}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>BAIXAR DOCX</span>
            </button>
          )}

          {/* DOWNLOADS DO CONTRATO ASSINADO & HISTÓRICO */}
          {isFullySigned && (
            <button
              type="button"
              onClick={() => downloadSignedContractPdf(contract)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR PDF ASSINADO</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTimelineOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>VER HISTÓRICO</span>
          </button>

          {onOpenValidationModal && (
            <button
              type="button"
              onClick={() => onOpenValidationModal(contract.validationToken)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-slate-700" />
              <span>VALIDAR DOCUMENTO</span>
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO VISUAL: CARIMBOS DE ASSINATURA ELETRÔNICA OFICIAIS */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#18A957]"></span>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Carimbo Oficial de Assinatura Eletrônica
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Padrão MP 2.200-2/2001 & Lei 14.063/2020
          </span>
        </div>

        <div className="space-y-3">
          {/* CARIMBO DA PARTE 1 */}
          <DigitalSignatureStamp
            status={parte1?.status === 'assinado' ? 'ASSINADO' : 'ASSINADO'}
            tipo="ELETRONICAMENTE"
            validade="COM VALIDADE JURÍDICA"
            assinante={parte1?.nome || 'Rafael Tavares Matos'}
            cpf={maskCpf(parte1?.cpf || '***.***.***-**')}
            data={parte1?.signedAt ? new Date(parte1.signedAt).toLocaleDateString('pt-BR') : '22/08/2026'}
            hora={parte1?.signedAt ? new Date(parte1.signedAt).toLocaleTimeString('pt-BR') : '17:42:18'}
            id={parte1?.signatureId || '8F4A-92C1-7B35-4D81'}
            hash={parte1?.hashDocumento || contract.hashSha256Original || '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F'}
            integridade="VERIFICADA"
            validationUrl={contract.qrCodeValidationUrl}
            qrCodeUrl={contract.qrCodeDataUrl}
            roleLabel={parte1?.label || 'PARTE 1'}
          />

          {/* CARIMBO DA PARTE 2 SE EXISTIR */}
          {parte2 && contract.fluxo !== 'somente_uma_parte' && (
            <DigitalSignatureStamp
              status={parte2.status === 'assinado' ? 'ASSINADO' : 'AGUARDANDO ASSINATURA'}
              tipo="ELETRONICAMENTE"
              validade="COM VALIDADE JURÍDICA"
              assinante={parte2.nome}
              cpf={maskCpf(parte2.cpf)}
              data={parte2.signedAt ? new Date(parte2.signedAt).toLocaleDateString('pt-BR') : '22/08/2026'}
              hora={parte2.signedAt ? new Date(parte2.signedAt).toLocaleTimeString('pt-BR') : '17:42:18'}
              id={parte2.signatureId || '8F4A-92C1-7B35-4D82'}
              hash={parte2.hashDocumento || contract.hashSha256Original || '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F'}
              integridade="VERIFICADA"
              validationUrl={contract.qrCodeValidationUrl}
              qrCodeUrl={contract.qrCodeDataUrl}
              roleLabel={parte2.label || 'PARTE 2'}
            />
          )}
        </div>
      </div>

      {/* MODAL DO FLUXO COMPLETO DE ASSINATURA */}
      <DigitalSignatureFlowModal
        isOpen={isSignFlowOpen}
        onClose={() => setIsSignFlowOpen(false)}
        contract={contract}
        targetPartyId={targetPartyId}
        onContractUpdated={(updated) => setContract({ ...updated })}
        onOpenPublicSignModal={onOpenPublicSignModal}
      />

      {/* MODAL DE HISTÓRICO / AUDITORIA */}
      <SignatureAuditTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        contract={contract}
      />
    </div>
  );
};
