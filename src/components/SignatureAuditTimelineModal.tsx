import React from 'react';
import { 
  X, 
  History, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Smartphone, 
  Globe, 
  FileText,
  Share2,
  Lock,
  UserCheck
} from 'lucide-react';
import { ContratoAssinaturaDigital, EventoAuditoriaAssinatura } from '../types/digitalSignature';
import { maskCpf } from '../utils/digitalSignatureService';

interface SignatureAuditTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContratoAssinaturaDigital | null;
}

export const SignatureAuditTimelineModal: React.FC<SignatureAuditTimelineModalProps> = ({
  isOpen,
  onClose,
  contract,
}) => {
  if (!isOpen || !contract) return null;

  const getEventIcon = (tipo: EventoAuditoriaAssinatura['tipo']) => {
    switch (tipo) {
      case 'CONTRATO_CRIADO':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'CONTRATO_ENVIADO':
      case 'LINK_ENVIADO_PARTE_2':
      case 'LINK_RECOMPARTILHADO':
        return <Share2 className="w-4 h-4 text-indigo-600" />;
      case 'DOCUMENTO_ABERTO':
      case 'PARTE_1_ABRIU':
      case 'PARTE_2_ABRIU':
        return <Globe className="w-4 h-4 text-amber-600" />;
      case 'IDENTIDADE_CONFIRMADA':
      case 'ASSINATURA_INICIADA':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'ASSINATURA_REALIZADA':
      case 'PARTE_1_ASSINOU':
      case 'PARTE_2_ASSINOU':
      case 'ASSINATURA_2_REALIZADA':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'CONTRATO_FINALIZADO':
        return <ShieldCheck className="w-4 h-4 text-emerald-700" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* CABEÇALHO */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-extrabold text-slate-900">
                  Trilha de Auditoria & Linha do Tempo
                </h2>
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  {contract.contractVersionId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Contrato: <strong className="text-slate-800">{contract.contractId}</strong> | Token: <span className="font-mono text-emerald-700 font-semibold">{contract.validationToken}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RESUMO DE INTEGRIDADE */}
        <div className="bg-emerald-50/70 border-b border-emerald-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-emerald-900">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Integridade Criptográfica:</strong> Hash SHA-256 verificado e inalterável
            </span>
          </div>
          <span className="font-mono text-[11px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold">
            {contract.hashSha256Original.substring(0, 16)}...
          </span>
        </div>

        {/* TIMELINE BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STATUS ATUAL DAS PARTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contract.partes.map((parte, idx) => (
              <div 
                key={parte.id} 
                className={`p-3.5 rounded-xl border ${
                  parte.status === 'assinado' 
                    ? 'border-emerald-300 bg-emerald-50/50' 
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Parte {idx + 1}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    parte.status === 'assinado' 
                      ? 'bg-emerald-100 text-emerald-800 font-mono' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {parte.status === 'assinado' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Assinado
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pendente
                      </>
                    )}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{parte.nome}</div>
                <div className="text-xs text-slate-600 font-mono">CPF: {maskCpf(parte.cpf)}</div>
                {parte.signedAt && (
                  <div className="text-[11px] text-emerald-800 font-mono mt-1 pt-1 border-t border-emerald-200 flex items-center justify-between">
                    <span>{new Date(parte.signedAt).toLocaleString('pt-BR')}</span>
                    <span className="font-bold">ID: {parte.signatureId?.substring(0, 8)}...</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* LISTA CRONOLÓGICA DE EVENTOS */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <History className="w-3.5 h-3.5" />
              <span>Registro de Eventos Criptográficos ({contract.eventos?.length || 0})</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {contract.eventos && contract.eventos.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Ponto na linha */}
                  <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-white border-2 border-slate-400 flex items-center justify-center group-hover:border-emerald-600 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-600" />
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        {getEventIcon(evt.tipo)}
                        <span className="font-bold text-xs text-slate-900">{evt.tipo.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        {evt.dataHoraFormatada || new Date(evt.dataHora).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {evt.descricao}
                    </p>

                    <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono gap-2">
                      <span>Usuário: <strong className="text-slate-700">{evt.usuario}</strong></span>
                      <span>IP: {evt.ip}</span>
                      <span className="truncate max-w-[180px]">{evt.dispositivo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Auditoria em conformidade com ICP-Brasil & Lei 14.063/2020</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
