import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  ArrowLeft, 
  X,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ContratoAssinaturaDigital, ParteAssinante } from '../types/digitalSignature';
import { 
  confirmPartyIdentity,
  downloadSignedContractPdf, 
  executeDigitalSignature, 
  getDigitalContractByToken, 
  maskCpf, 
  recordContractEvent 
} from '../utils/digitalSignatureService';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';

interface PublicSignPageProps {
  token: string;
  onBackToApp?: () => void;
  onViewValidation?: (validationToken: string) => void;
}

export const PublicSignPage: React.FC<PublicSignPageProps> = ({
  token,
  onBackToApp,
  onViewValidation,
}) => {
  const [data, setData] = useState<{
    contract: ContratoAssinaturaDigital;
    party: ParteAssinante;
  } | null>(null);

  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ETAPA DE DESBLOQUEIO POR IDENTIDADE (últimos 4 dígitos do CPF/CNPJ)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [last4Input, setLast4Input] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);

  useEffect(() => {
    const result = getDigitalContractByToken(token);
    if (result) {
      setData(result);
      if (result.party.status === 'assinado') {
        setIsSuccess(true);
        setIsUnlocked(true);
      }

      // Registrar abertura pela parte (link acessado, contrato ainda bloqueado)
      recordContractEvent(
        result.contract.id,
        'PARTE_2_ABRIU',
        result.party.nome,
        `${result.party.nome} acessou o link exclusivo de assinatura (${result.party.tokenAssinatura}). Contrato permanece bloqueado até confirmação de identidade.`
      );
    }
  }, [token]);

  const handleConfirmIdentity = () => {
    if (!data) return;
    setIdentityError('');
    if (last4Input.replace(/\D/g, '').length !== 4) {
      setIdentityError('Informe os 4 últimos dígitos do CPF/CNPJ.');
      return;
    }
    setIsVerifyingIdentity(true);
    const res = confirmPartyIdentity(data.contract.id, data.party.tokenAssinatura, last4Input);
    setIsVerifyingIdentity(false);

    if (res.success && res.contract && res.party) {
      setData({ contract: res.contract, party: res.party });
      setIsUnlocked(true);
    } else {
      setIdentityError('Dígitos informados não conferem com o CPF/CNPJ cadastrado para esta parte.');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-300 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <X className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-heading font-extrabold text-slate-900">Link de Assinatura Não Encontrado</h2>
          <p className="text-xs text-slate-600">
            Este link pode ter expirado, ter sido substituído por uma versão mais recente ou estar incorreto.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Voltar ao Sistema
            </button>
          )}
        </div>
      </div>
    );
  }

  const { contract, party } = data;

  const handleSign = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError('Digite o código de 6 dígitos enviado pela imobiliária.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await executeDigitalSignature(
        contract.id,
        party.tokenAssinatura,
        'link',
        otpCode,
        null
      );

      setData({ contract: res.contract, party: res.contract.partes.find(p => p.id === party.id) || party });
      setIsSuccess(true);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setOtpError(err.message || 'Erro ao registrar assinatura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* BARRA SUPERIOR */}
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  Portal Seguro de Assinatura
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {contract.contractVersionId}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mt-1">
                ASSINATURA DE CONTRATO
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-1 rounded-lg flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
              Contrato disponível para assinatura
            </span>
          </div>
        </div>

        {/* CARTÃO DE IDENTIFICAÇÃO DO ASSINANTE (ITEM 6) */}
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-mono block">Contrato:</span>
            <span className="font-bold text-slate-900 text-sm">{contract.titulo}</span>
            <span className="text-[11px] text-slate-500 font-mono block">ID: {contract.contractId}</span>
          </div>
          <div>
            <span className="text-slate-500 font-mono block">Seu nome:</span>
            <span className="font-bold text-slate-900 text-sm">{party.nome}</span>
            <span className="text-[11px] text-emerald-700 font-bold block">{party.label}</span>
          </div>
          <div>
            <span className="text-slate-500 font-mono block">CPF:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{maskCpf(party.cpf)}</span>
            <span className="text-[11px] text-slate-500 font-mono block">Hash: {contract.hashSha256Original.substring(0, 12)}...</span>
          </div>
        </div>

        {/* SE JÁ ESTÁ ASSINADO COM SUCESSO */}
        {isSuccess ? (
          <div className="bg-white rounded-2xl p-8 border-2 border-emerald-300 shadow-lg text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-heading font-extrabold text-emerald-950">
                ASSINATURA CONCLUÍDA COM SUCESSO!
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Sua assinatura eletrônica foi autenticada e vinculada criptograficamente a este instrumento com validade jurídica plena (Lei Federal nº 14.063/2020).
              </p>
            </div>

            <div className="max-w-2xl mx-auto w-full text-left">
              <DigitalSignatureStamp
                status="ASSINADO"
                tipo="ELETRONICAMENTE"
                validade="COM VALIDADE JURÍDICA"
                assinante={party.nome}
                cpf={maskCpf(party.cpf)}
                data={party.signedAt ? new Date(party.signedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                hora={party.signedAt ? new Date(party.signedAt).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR')}
                id={party.signatureId || contract.validationToken}
                hash={party.hashDocumento || contract.hashSha256Original}
                integridade="VERIFICADA"
                validationUrl={contract.qrCodeValidationUrl}
                qrCodeUrl={contract.qrCodeDataUrl}
                roleLabel={party.label}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadSignedContractPdf(contract)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>BAIXAR PDF ASSINADO</span>
              </button>

              {onViewValidation && (
                <button
                  type="button"
                  onClick={() => onViewValidation(contract.validationToken)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VALIDAR ASSINATURAS (QR CODE)</span>
                </button>
              )}
            </div>
          </div>
        ) : !isUnlocked ? (
          /* ETAPA DE BLOQUEIO: CONTRATO BORRADO ATÉ CONFIRMAÇÃO DE IDENTIDADE */
          <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 blur-sm pointer-events-none select-none opacity-60">
              <div className="h-72 rounded-xl border-2 border-slate-300 bg-slate-50 p-6 space-y-3">
                <div className="h-4 w-2/3 bg-slate-300 rounded" />
                <div className="h-3 w-full bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-200 rounded" />
                <div className="h-3 w-5/6 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-200 rounded" />
                <div className="h-3 w-3/4 bg-slate-200 rounded" />
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-slate-900 text-sm sm:text-base">
                    Contrato Bloqueado
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Confirme os 4 últimos dígitos do CPF/CNPJ para desbloquear o contrato.
                  </p>
                </div>

                <input
                  type="text"
                  maxLength={4}
                  value={last4Input}
                  onChange={(e) => {
                    setLast4Input(e.target.value.replace(/\D/g, ''));
                    setIdentityError('');
                  }}
                  placeholder="••••"
                  className="w-32 mx-auto text-center text-xl font-mono font-extrabold tracking-widest px-3 py-2 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 rounded-xl focus:outline-none block"
                />

                {identityError && (
                  <p className="text-xs text-red-600 font-bold">{identityError}</p>
                )}

                <button
                  type="button"
                  disabled={isVerifyingIdentity || last4Input.length !== 4}
                  onClick={handleConfirmIdentity}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer ${
                    last4Input.length === 4 && !isVerifyingIdentity
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isVerifyingIdentity ? 'VERIFICANDO...' : 'DESBLOQUEAR CONTRATO'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* DOCUMENTO COMPLETO PARA VISUALIZAÇÃO E ROLAGEM + ASSINATURA (IDENTIDADE JÁ CONFIRMADA) */
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6">
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Identidade confirmada. Contrato desbloqueado para leitura.</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Minuta Integral do Contrato (Role para ler completamente):
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  {contract.contractVersionId}
                </span>
              </div>

              <div className="h-96 overflow-y-auto rounded-xl border-2 border-slate-300 bg-white p-6 text-slate-900 text-xs sm:text-sm leading-relaxed shadow-inner space-y-4">
                <div dangerouslySetInnerHTML={{ __html: contract.documentoHtml }} />
              </div>
            </div>

            {/* CHECKBOX OBRIGATÓRIO */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAgreedTerms}
                  onChange={(e) => setHasAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug select-none">
                  Li e concordo com os termos deste contrato.
                </span>
              </label>
            </div>

            {/* SEÇÃO DE ASSINATURA COM CÓDIGO DE 6 DÍGITOS ENVIADO PELA IMOBILIÁRIA */}
            {hasAgreedTerms && (
              <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-slate-900 text-sm sm:text-base">
                    Código de Assinatura
                  </h3>
                  <p className="text-xs text-slate-600">
                    Digite o código de 6 dígitos exclusivo enviado a você pela imobiliária (WhatsApp ou e-mail) para concluir a assinatura.
                  </p>
                </div>

                <div className="bg-white border border-slate-300 rounded-xl p-4 text-center space-y-3">
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
                      className="w-48 text-center text-2xl font-mono font-extrabold tracking-widest px-4 py-2 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 rounded-xl focus:outline-none"
                    />
                  </div>

                  {otpError && (
                    <p className="text-xs text-red-600 font-bold">{otpError}</p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || otpCode.length !== 6}
                  onClick={handleSign}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer ${
                    otpCode.length === 6 && !isSubmitting
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>{isSubmitting ? 'REGISTRANDO ASSINATURA...' : 'ASSINAR'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
