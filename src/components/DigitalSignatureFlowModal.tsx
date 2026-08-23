import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  KeyRound, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Share2, 
  FileText,
  Clock,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ContratoAssinaturaDigital, MetodoAutenticacao, ParteAssinante } from '../types/digitalSignature';
import { executeDigitalSignature, generateSignatureCode, maskCpf, maskEmail, maskPhone, recordContractEvent } from '../utils/digitalSignatureService';

interface DigitalSignatureFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContratoAssinaturaDigital | null;
  targetPartyId?: string; // Se omitido, assina a Parte 1
  onContractUpdated: (updated: ContratoAssinaturaDigital) => void;
  onOpenPublicSignModal?: (token: string) => void;
}

export const DigitalSignatureFlowModal: React.FC<DigitalSignatureFlowModalProps> = ({
  isOpen,
  onClose,
  contract,
  targetPartyId,
  onContractUpdated,
  onOpenPublicSignModal,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [authMethod, setAuthMethod] = useState<MetodoAutenticacao>('whatsapp');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('742918');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSignModal, setPostSignModal] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Signatário atual
  const currentParty: ParteAssinante | undefined = contract?.partes.find(p => 
    targetPartyId ? (p.id === targetPartyId || p.tokenAssinatura === targetPartyId) : p.role === 'parte_1'
  ) || contract?.partes[0];

  const secondParty: ParteAssinante | undefined = contract?.partes.find(p => p.role === 'parte_2') || contract?.partes[1];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setHasAgreedTerms(false);
      setOtpCode('');
      setIsOtpSent(false);
      setOtpError('');
      setPostSignModal(false);

      // Registrar evento de abertura do documento
      if (contract && currentParty) {
        recordContractEvent(
          contract.id,
          'DOCUMENTO_ABERTO',
          currentParty.nome,
          `${currentParty.nome} abriu o contrato ${contract.contractId} (${contract.contractVersionId}) para leitura e conferência.`
        );
      }
    }
  }, [isOpen, contract?.id, currentParty?.id]);

  if (!isOpen || !contract || !currentParty) return null;

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const secondPartySignUrl = secondParty ? `${appOrigin}/assinar/${secondParty.tokenAssinatura}` : '';

  // Gera o próprio código de assinatura da empresa (nunca reutiliza o código do cliente).
  // A empresa já está autenticada por login no sistema; o código próprio serve como
  // confirmação final e segundo fator antes de "Confirmar e assinar".
  const handleSendOtp = (method: MetodoAutenticacao = authMethod) => {
    setIsOtpSent(true);
    setOtpError('');
    setOtpCode('');

    const res = generateSignatureCode(contract.id, currentParty.tokenAssinatura, 24);
    setGeneratedOtp(res.code);
    onContractUpdated(res.contract);

    setTimeout(() => {
      setOtpCode(res.code);
    }, 400);
  };

  const handleGoToStep4 = () => {
    if (!hasAgreedTerms) return;
    setCurrentStep(4);
    handleSendOtp(authMethod);
    recordContractEvent(
      contract.id,
      'IDENTIDADE_CONFIRMADA',
      currentParty.nome,
      `${currentParty.nome} confirmou concordância integral com o teor do contrato.`
    );
  };

  const handleConfirmSignature = async () => {
    if (otpCode.trim().length < 6) {
      setOtpError('Código de autenticação inválido. Por favor, digite os 6 dígitos recebidos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executeDigitalSignature(
        contract.id,
        currentParty.id,
        authMethod,
        otpCode,
        null
      );

      onContractUpdated(result.contract);

      // Efeito de celebração
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Se houver segunda parte e não for fluxo de somente 1 parte, mostra tela pós-assinatura
      if (contract.fluxo !== 'somente_uma_parte' && secondParty && secondParty.status !== 'assinado') {
        setPostSignModal(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      setOtpError(err.message || 'Erro ao processar assinatura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (secondPartySignUrl) {
      navigator.clipboard.writeText(secondPartySignUrl);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 3000);
    }
  };

  const handleCopyCode = () => {
    if (secondParty?.codigoAssinatura) {
      navigator.clipboard.writeText(secondParty.codigoAssinatura);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 3000);
    }
  };

  // Gera código de assinatura de 6 dígitos exclusivo para a segunda parte (item 2 do fluxo)
  const handleGenerateCode = () => {
    if (!contract || !secondParty) return;
    setIsGeneratingCode(true);
    try {
      const res = generateSignatureCode(contract.id, secondParty.tokenAssinatura, 72);
      onContractUpdated(res.contract);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!secondParty) return;
    const codigoParte = secondParty.codigoAssinatura ? `\n\nSeu código de assinatura (6 dígitos): ${secondParty.codigoAssinatura}` : '';
    const msg = `Olá *${secondParty.nome}*, o seu contrato imobiliário (*${contract.titulo}*) já foi assinado pela primeira parte e está disponível para a sua assinatura digital com validade jurídica.\n\nAcesse o seu link seguro exclusivo:\n${secondPartySignUrl}${codigoParte}`;
    const cleanPhone = secondParty.telefone.replace(/\D/g, '');
    const url = cleanPhone.length >= 10 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    if (!secondParty) return;
    const subject = `Assinatura de Contrato - ${contract.contractId} (${contract.titulo})`;
    const codigoParte = secondParty.codigoAssinatura ? `\n\nSeu código de assinatura (6 dígitos): ${secondParty.codigoAssinatura}` : '';
    const body = `Olá ${secondParty.nome},\n\nO documento "${contract.titulo}" já foi assinado pela primeira parte e agora requer a sua assinatura eletrônica.\n\nClique no link seguro para assinar:\n${secondPartySignUrl}${codigoParte}\n\nAtenciosamente,\nImobGestão`;
    window.open(`mailto:${secondParty.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleShareNative = () => {
    if (navigator.share && secondParty) {
      navigator.share({
        title: `Assinatura de Contrato - ${contract.contractId}`,
        text: `Contrato disponível para assinatura de ${secondParty.nome}`,
        url: secondPartySignUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  // TELA PÓS-ASSINATURA (SEGUNDA PARTE OBRIGATÓRIA)
  if (postSignModal && secondParty) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col">
          {/* HEADER PÓS-ASSINATURA */}
          <div className="bg-emerald-600 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-extrabold">ASSINATURA REALIZADA</h2>
                <p className="text-xs text-emerald-100 font-mono">
                  Sua assinatura foi registrada com sucesso (ID: {currentParty.signatureId || 'REGISTRADO'})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
              <p className="text-sm font-bold text-emerald-950">
                Agora envie o documento para a outra parte assinar.
              </p>
              <p className="text-xs text-emerald-800">
                O contrato será automaticamente finalizado com validade jurídica assim que ambas as partes concluírem a assinatura.
              </p>
            </div>

            {/* DADOS DA SEGUNDA PARTE */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                Dados da Segunda Parte (Comprador / Adquirente)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Nome:</span>
                  <span className="font-bold text-slate-900">{secondParty.nome}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">CPF:</span>
                  <span className="font-mono font-bold text-slate-800">{maskCpf(secondParty.cpf)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Telefone / WhatsApp:</span>
                  <span className="font-bold text-slate-800">{secondParty.telefone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail:</span>
                  <span className="font-bold text-slate-800">{secondParty.email || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* CÓDIGO DE ASSINATURA DE 6 DÍGITOS (EXCLUSIVO DESTA PARTE) */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                Código de Assinatura (6 dígitos):
              </label>
              {secondParty.codigoAssinatura ? (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 text-lg font-mono font-extrabold tracking-widest bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-center">
                    {secondParty.codigoAssinatura}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    {isCopiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    title="Gerar novo código (invalida o anterior)"
                    className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    Renovar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isGeneratingCode ? 'GERANDO...' : 'GERAR CÓDIGO DE ASSINATURA'}</span>
                </button>
              )}
              <p className="text-[11px] text-slate-500">
                Copie o link e o código abaixo e envie ao assinante. O contrato só é desbloqueado após a confirmação dos 4 últimos dígitos do CPF/CNPJ, e a assinatura só é concluída com este código.
              </p>
            </div>

            {/* LINK EXCLUSIVO */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                Link Exclusivo de Assinatura:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={secondPartySignUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  {isCopiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* BOTÕES DE ENVIO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Enviar E-mail</span>
              </button>

              <button
                type="button"
                onClick={handleShareNative}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
              </button>
            </div>

            {/* BOTÃO PARA SIMULAR/ABRIR PÁGINA DA OUTRA PARTE */}
            {onOpenPublicSignModal && (
              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPublicSignModal(secondParty.tokenAssinatura);
                  }}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-mono font-bold flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Simular Acesso da 2ª Parte Agora (Página Pública de Assinatura)</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-extrabold">Assinatura Digital de Contrato</h2>
                <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  {contract.contractVersionId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Registro: <strong className="text-white">{contract.contractId}</strong> ({contract.titulo})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROGRESSO DAS ETAPAS */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                1
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">Visualizar</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200" />

            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">Identificação</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200" />

            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                3
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">Autenticação</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200" />

            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                currentStep >= 5 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                4
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">Assinar</span>
            </div>
          </div>
        </div>

        {/* CORPO DO FLUXO */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ETAPA 1 & 2 & 3: VISUALIZAÇÃO DO CONTRATO + IDENTIFICAÇÃO + CHECKBOX */}
          {currentStep <= 3 && (
            <div className="space-y-5">
              {/* ETAPA 2: IDENTIFICAÇÃO DO ASSINANTE */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  Você está assinando este documento como:
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{currentParty.nome}</span>
                    <span className="text-xs text-slate-700 font-mono font-semibold">CPF: {maskCpf(currentParty.cpf)} ({currentParty.label})</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1 rounded-lg">
                    {currentParty.role === 'parte_1' ? 'Parte 1' : 'Parte 2'}
                  </span>
                </div>
              </div>

              {/* ETAPA 1: VISUALIZAÇÃO DO CONTRATO COMPLETO COM ROLAGEM */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Etapa 1: Leitura e Conferência da Minuta Completa
                </label>
                <div className="h-64 sm:h-80 overflow-y-auto rounded-xl border-2 border-slate-300 bg-white p-5 text-slate-800 text-xs shadow-inner leading-relaxed space-y-4">
                  <div dangerouslySetInnerHTML={{ __html: contract.documentoHtml }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                  <span>Role a caixa acima para conferir o contrato completo.</span>
                  <span className="font-mono font-bold text-slate-700">Hash SHA-256: {contract.hashSha256Original.substring(0, 16)}...</span>
                </p>
              </div>

              {/* ETAPA 3: CHECKBOX OBRIGATÓRIO */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAgreedTerms}
                    onChange={(e) => setHasAgreedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900 leading-snug select-none">
                    Li o contrato completo e concordo integralmente com seu conteúdo e termos jurídicos.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ETAPA 4 & 5: AUTENTICAÇÃO DO ASSINANTE */}
          {currentStep >= 4 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-900">Signatário: {currentParty.nome}</span>
                <p className="text-xs text-slate-600">
                  Selecione o canal para receber o código seguro de autenticação de dois fatores (2FA).
                </p>
              </div>

              {/* SELEÇÃO DO MÉTODO DE AUTENTICAÇÃO */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Método de Autenticação Disponível:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('whatsapp');
                      handleSendOtp('whatsapp');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                      authMethod === 'whatsapp'
                        ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                        : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('sms');
                      handleSendOtp('sms');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                      authMethod === 'sms'
                        ? 'border-2 border-blue-600 bg-blue-50 text-blue-950 shadow-xs'
                        : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('email');
                      handleSendOtp('email');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                      authMethod === 'email'
                        ? 'border-2 border-indigo-600 bg-indigo-50 text-indigo-950 shadow-xs'
                        : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                    }`}
                  >
                    <Mail className="w-5 h-5 text-indigo-600" />
                    <span>E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('adicional');
                      handleSendOtp('adicional');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                      authMethod === 'adicional'
                        ? 'border-2 border-purple-600 bg-purple-50 text-purple-950 shadow-xs'
                        : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                    }`}
                  >
                    <KeyRound className="w-5 h-5 text-purple-600" />
                    <span>Token / 2FA</span>
                  </button>
                </div>
              </div>

              {/* CAMPO DO CÓDIGO OTP */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-4 text-center">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">
                    Código de 6 dígitos enviado para {authMethod === 'whatsapp' || authMethod === 'sms' ? maskPhone(currentParty.telefone) : maskEmail(currentParty.email)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Digite o código de verificação recebido para autenticar legalmente sua assinatura eletrônica.
                  </p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, ''));
                      setOtpError('');
                    }}
                    placeholder="••••••"
                    className="w-48 text-center text-2xl font-mono font-extrabold tracking-widest px-4 py-2.5 bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-xl focus:outline-none"
                  />
                </div>

                {otpError && (
                  <p className="text-xs text-red-600 font-bold">{otpError}</p>
                )}

                <div className="flex items-center justify-center space-x-2 text-xs">
                  <span className="text-slate-500">Não recebeu?</span>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(authMethod)}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Reenviar Código
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ E BOTÕES DE AÇÃO */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          {currentStep >= 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Minuta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {currentStep <= 3 ? (
            <button
              type="button"
              disabled={!hasAgreedTerms}
              onClick={handleGoToStep4}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shadow-xs cursor-pointer ${
                hasAgreedTerms
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>CONTINUAR PARA ASSINATURA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || otpCode.length < 4}
              onClick={handleConfirmSignature}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shadow-xs cursor-pointer ${
                otpCode.length >= 4 && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'REGISTRANDO ASSINATURA...' : 'ASSINAR DOCUMENTO'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
