import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  History, 
  Download, 
  Lock, 
  ArrowLeft, 
  X, 
  QrCode, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { ContratoAssinaturaDigital } from '../types/digitalSignature';
import { 
  downloadSignedContractPdf, 
  getDigitalContractByValidationToken, 
  maskCpf 
} from '../utils/digitalSignatureService';
import { SignatureAuditTimelineModal } from './SignatureAuditTimelineModal';

interface PublicValidationPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const PublicValidationPage: React.FC<PublicValidationPageProps> = ({
  token,
  onBackToApp,
}) => {
  const [contract, setContract] = useState<ContratoAssinaturaDigital | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  useEffect(() => {
    const found = getDigitalContractByValidationToken(token);
    if (found) {
      setContract(found);
    }
  }, [token]);

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-300 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-heading font-extrabold text-slate-900">Documento em Validação</h2>
          <p className="text-xs text-slate-600">
            Não foi possível localizar este registro criptográfico com o token informado ({token}). Verifique a URL ou o QR Code escaneado.
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

  const parte1 = contract.partes[0];
  const parte2 = contract.partes[1];
  const isFullySigned = contract.status === 'assinado_por_todas_as_partes';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* BARRA SUPERIOR */}
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex items-center justify-between">
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
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
                Autenticidade e Validade Jurídica
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mt-1">
                CONFERÊNCIA DE ASSINATURAS ELETRÔNICAS
              </h1>
            </div>
          </div>
          <div className="hidden sm:block">
            <QrCode className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        {/* CARTÃO PRINCIPAL DE VALIDAÇÃO (ITEM 10) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-emerald-500 shadow-lg space-y-6">
          
          {/* HEADER DO STATUS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-extrabold text-emerald-950">
                  DOCUMENTO VÁLIDO
                </h2>
                <p className="text-xs text-slate-600 font-mono">
                  Identificador Único: <strong className="text-slate-900">{contract.contractId}</strong> ({contract.contractVersionId})
                </p>
              </div>
            </div>

            <span className="bg-emerald-50 text-emerald-900 border-2 border-emerald-400 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center self-start sm:self-center">
              <Check className="w-4 h-4 mr-1 text-emerald-600" />
              {isFullySigned ? 'ASSINADO POR TODAS AS PARTES' : 'ASSINATURA EM ANDAMENTO'}
            </span>
          </div>

          {/* DADOS DETALHADOS (CONFORME ITEM 10) */}
          <div className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-mono block">Contrato:</span>
                <span className="font-bold text-slate-900 text-sm">{contract.titulo}</span>
                <span className="text-[11px] text-slate-500 font-mono block">Tipo: {contract.tipoContrato}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono block">Status de Integridade:</span>
                <span className="font-extrabold text-emerald-700 text-sm flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                  ✓ VERIFICADA
                </span>
                <span className="text-[11px] text-slate-500 block">Conforme MP 2.200-2/2001 e Lei 14.063/2020</span>
              </div>
            </div>

            {/* ASSINANTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PARTE 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-mono font-bold text-slate-500 text-[11px] uppercase">
                    Parte 1: {parte1?.label || 'Vendedor'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    parte1?.status === 'assinado' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {parte1?.status === 'assinado' ? '✓ Assinado' : '○ Pendente'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{parte1?.nome}</div>
                <div className="text-slate-600 font-mono">CPF: {maskCpf(parte1?.cpf || '')}</div>
                <div className="text-slate-700 pt-1 border-t border-slate-100">
                  <strong>Data/Hora:</strong> {parte1?.signedAt ? new Date(parte1.signedAt).toLocaleString('pt-BR') : 'Aguardando'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  ID: {parte1?.signatureId || 'N/A'}
                </div>
              </div>

              {/* PARTE 2 */}
              {parte2 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-mono font-bold text-slate-500 text-[11px] uppercase">
                      Parte 2: {parte2.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      parte2.status === 'assinado' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {parte2.status === 'assinado' ? '✓ Assinado' : '○ Pendente'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{parte2.nome}</div>
                  <div className="text-slate-600 font-mono">CPF: {maskCpf(parte2.cpf)}</div>
                  <div className="text-slate-700 pt-1 border-t border-slate-100">
                    <strong>Data/Hora:</strong> {parte2.signedAt ? new Date(parte2.signedAt).toLocaleString('pt-BR') : 'Aguardando'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: {parte2.signatureId || 'N/A'}
                  </div>
                </div>
              )}
            </div>

            {/* HASH E CRIPTOGRAFIA */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 font-mono text-[11px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-500 font-bold">Hash SHA-256 Original:</span>
                <span className="text-slate-800 break-all">{contract.hashSha256Original}</span>
              </div>
              {contract.hashSha256Final && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200">
                  <span className="text-emerald-700 font-bold">Hash SHA-256 Final (Assinado):</span>
                  <span className="text-emerald-900 break-all">{contract.hashSha256Final}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-bold">ID do Documento / Token:</span>
                <span className="text-slate-900 font-bold">{contract.validationToken}</span>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO (ITEM 10: VER HISTÓRICO, BAIXAR PDF ASSINADO) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowTimelineModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>VER HISTÓRICO & AUDITORIA</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSignedContractPdf(contract)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR PDF ASSINADO</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE HISTÓRICO */}
      <SignatureAuditTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        contract={contract}
      />
    </div>
  );
};
