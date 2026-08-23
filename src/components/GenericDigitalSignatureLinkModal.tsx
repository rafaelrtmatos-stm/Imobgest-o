import React, { useEffect, useState } from 'react';
import { X, Link2, Copy, Check, Share2, Clock, ShieldCheck, MessageSquare } from 'lucide-react';
import { ContratoAssinaturaDigital, ParteAssinante } from '../types/digitalSignature';
import {
  GenericDigitalContractInput,
  createOrGetDigitalContractGeneric,
  generateSignatureCode,
} from '../utils/digitalSignatureService';

interface GenericDigitalSignatureLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  input: GenericDigitalContractInput | null;
}

type ValidityOption = '10m' | '30m' | '1h' | '2h' | '24h' | 'custom';

const VALIDITY_HOURS: Record<Exclude<ValidityOption, 'custom'>, number> = {
  '10m': 10 / 60,
  '30m': 30 / 60,
  '1h': 1,
  '2h': 2,
  '24h': 24,
};

const VALIDITY_LABEL: Record<ValidityOption, string> = {
  '10m': '10 minutos',
  '30m': '30 minutos',
  '1h': '1 hora',
  '2h': '2 horas',
  '24h': '24 horas',
  custom: 'Validade personalizada',
};

export const GenericDigitalSignatureLinkModal: React.FC<GenericDigitalSignatureLinkModalProps> = ({
  isOpen,
  onClose,
  input,
}) => {
  const [contract, setContract] = useState<ContratoAssinaturaDigital | null>(null);
  const [loading, setLoading] = useState(false);
  const [validity, setValidity] = useState<ValidityOption>('24h');
  const [customHours, setCustomHours] = useState(48);
  const [copiedPartyId, setCopiedPartyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !input) return;
    let mounted = true;
    setLoading(true);
    createOrGetDigitalContractGeneric(input)
      .then(c => {
        if (mounted) setContract(c);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isOpen, input]);

  if (!isOpen || !input) return null;

  const validityHours = validity === 'custom' ? customHours : VALIDITY_HOURS[validity];

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const buildMessage = (party: ParteAssinante, code: string) => {
    const link = `${appOrigin}/assinar/${party.tokenAssinatura}`;
    return `Olá, ${party.nome}! Segue o link para assinatura digital do seu contrato ${contract?.contractId}.\n\nO código para assinatura é válido por ${VALIDITY_LABEL[validity]}.\n\nClique no link para assinatura:\n${link}\n\nSeu código de assinatura: ${code}`;
  };

  const handleGenerateLink = (party: ParteAssinante) => {
    if (!contract) return;
    const { contract: updated, code } = generateSignatureCode(contract.id, party.id, validityHours);
    setContract({ ...updated });
    return code;
  };

  const handleCopy = (party: ParteAssinante) => {
    const code = party.codigoAssinatura || handleGenerateLink(party);
    if (!code) return;
    navigator.clipboard.writeText(buildMessage(party, code));
    setCopiedPartyId(party.id);
    setTimeout(() => setCopiedPartyId(null), 2500);
  };

  const handleWhatsApp = (party: ParteAssinante) => {
    const code = party.codigoAssinatura || handleGenerateLink(party);
    if (!code) return;
    const msg = buildMessage(party, code);
    const cleanPhone = (party.telefone || '').replace(/\D/g, '');
    const url = cleanPhone.length >= 10
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Assinatura Digital
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading || !contract ? (
            <div className="text-center text-xs text-slate-500 font-mono py-10 animate-pulse">
              Preparando fluxo de assinatura digital...
            </div>
          ) : (
            <>
              {/* RESUMO */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 text-xs">
                <p><span className="font-bold text-slate-700">Contrato:</span> {contract.contractId}</p>
                <p><span className="font-bold text-slate-700">Tipo:</span> {contract.tipoContrato}</p>
              </div>

              {/* VALIDADE DO CÓDIGO */}
              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Validade do código</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['10m', '30m', '1h', '2h', '24h', 'custom'] as ValidityOption[]).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValidity(opt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        validity === opt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {VALIDITY_LABEL[opt]}
                    </button>
                  ))}
                </div>
                {validity === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    value={customHours}
                    onChange={(e) => setCustomHours(Number(e.target.value) || 1)}
                    className="mt-1 w-32 px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                    placeholder="Horas"
                  />
                )}
              </div>

              {/* PARTES / LINKS */}
              <div className="space-y-3">
                {contract.partes.map(party => {
                  const link = `${appOrigin}/assinar/${party.tokenAssinatura}`;
                  return (
                    <div key={party.id} className="border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{party.nome || 'Signatário'}</p>
                          <p className="text-[11px] text-slate-500">{party.label}</p>
                        </div>
                        {party.codigoAssinatura && (
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-1 rounded-lg">
                            Código: {party.codigoAssinatura}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-mono text-slate-600 truncate">{link}</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(party)}
                          className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                        >
                          {copiedPartyId === party.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{party.codigoAssinatura ? 'Copiar mensagem' : 'Gerar link + código'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(party)}
                          className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(party) as any}
                          className="flex items-center justify-center px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                          title="Compartilhar"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
