import React, { useState } from 'react';
import { FileSignature, Copy, Check, Send, Download, X, UserCheck, Loader2 } from 'lucide-react';
import { Contrato, ParteContrato, PapelParte, TipoContrato } from '../types';
import {
  sha256Hex, createVerificationCode, buildSignUrl,
  getClientNetworkInfo, markParteSigned, todasPartesAssinaram,
} from '../utils/signature';
import { generateSignedContractPdf, downloadBlob } from '../utils/pdf';
import { generateId } from '../utils/formatters';
import { upsertContratoToSupabase } from '../utils/supabaseClient';

interface SignatureManagerProps {
  contrato: Contrato;
  onUpdateContrato: (contrato: Contrato) => void;
  onClose: () => void;
}

function novaParteVazia(papel: PapelParte, interna: boolean): ParteContrato {
  return { id: generateId('parte'), papel, nome: '', cpfCnpj: '', telefone: '', interna };
}

const PAPEL_LABEL: Record<PapelParte, string> = {
  vendedor: 'Vendedor(a)', comprador: 'Comprador(a)',
  contratante: 'Contratante', contratado: 'Contratado(a) — Imobiliária', conjuge: 'Cônjuge',
};

export function SignatureManager({ contrato, onUpdateContrato, onClose }: SignatureManagerProps) {
  const jaConfigurado = !!contrato.partes && contrato.partes.length > 0;

  const [tipo, setTipo] = useState<TipoContrato>(contrato.tipoContrato || 'compra_venda');
  const [texto, setTexto] = useState(contrato.textoContrato || '');
  const [partesForm, setPartesForm] = useState<ParteContrato[]>(
    contrato.partes && contrato.partes.length
      ? contrato.partes
      : tipo === 'compra_venda'
        ? [novaParteVazia('vendedor', false), novaParteVazia('comprador', false)]
        : [novaParteVazia('contratante', false), novaParteVazia('contratado', true)]
  );
  const [conjugeAtivo, setConjugeAtivo] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [otpVisivel, setOtpVisivel] = useState<{ parteId: string; code: string } | null>(null);
  const [linkCopiadoId, setLinkCopiadoId] = useState<string | null>(null);
  const [gerandoOtpId, setGerandoOtpId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const trocarTipo = (novo: TipoContrato) => {
    setTipo(novo);
    setPartesForm(
      novo === 'compra_venda'
        ? [novaParteVazia('vendedor', false), novaParteVazia('comprador', false)]
        : [novaParteVazia('contratante', false), novaParteVazia('contratado', true)]
    );
    setConjugeAtivo({});
  };

  const atualizarParte = (id: string, patch: Partial<ParteContrato>) => {
    setPartesForm(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const toggleConjuge = (parteBaseId: string, papelBase: PapelParte) => {
    const ativo = !conjugeAtivo[parteBaseId];
    setConjugeAtivo(prev => ({ ...prev, [parteBaseId]: ativo }));
    if (ativo) {
      const conjuge: ParteContrato = { ...novaParteVazia('conjuge', false), conjugeDeParteId: parteBaseId };
      setPartesForm(prev => [...prev, conjuge]);
    } else {
      setPartesForm(prev => prev.filter(p => p.conjugeDeParteId !== parteBaseId));
    }
    void papelBase;
  };

  const podeSalvar = partesForm.every(p => p.nome.trim() && p.cpfCnpj?.replace(/\D/g, '').length) && texto.trim().length > 20;

  const handleIniciar = async () => {
    if (!podeSalvar) return;
    setSaving(true);
    try {
      const documentHash = await sha256Hex(texto.trim());
      const atualizado: Contrato = {
        ...contrato,
        tipoContrato: tipo,
        textoContrato: texto.trim(),
        partes: partesForm,
        documentHash,
        signatureStatus: 'aguardando_assinaturas',
      };
      onUpdateContrato(atualizado);
      const ok = await upsertContratoToSupabase(atualizado);
      if (!ok) alert('Atenção: não foi possível sincronizar com o Supabase agora. O link público só funciona depois de sincronizado — use "Sincronizar" no Backup.');
    } finally {
      setSaving(false);
    }
  };

  const handleGerarOtp = async (parte: ParteContrato) => {
    setGerandoOtpId(parte.id);
    try {
      const res = await createVerificationCode(contrato.id, parte.id);
      if (res) setOtpVisivel({ parteId: parte.id, code: res.code });
      else alert('Não foi possível gerar o código. Verifique a conexão com o Supabase.');
    } finally {
      setGerandoOtpId(null);
    }
  };

  const handleCopiarLink = (parte: ParteContrato) => {
    const url = buildSignUrl(contrato.id, parte.id);
    navigator.clipboard?.writeText(url);
    setLinkCopiadoId(parte.id);
    setTimeout(() => setLinkCopiadoId(null), 2000);
  };

  const handleConfirmarInterna = async (parte: ParteContrato) => {
    const nomeDigitado = prompt(`Confirme digitando o nome de quem está assinando por "${PAPEL_LABEL[parte.papel]}":`, parte.nome);
    if (!nomeDigitado || nomeDigitado.trim() !== parte.nome.trim()) {
      if (nomeDigitado !== null) alert('Nome não confere com o cadastrado. Assinatura não confirmada.');
      return;
    }
    setConfirmandoId(parte.id);
    try {
      const info = await getClientNetworkInfo();
      const partesAtualizadas = (contrato.partes || []).map(p => p.id === parte.id ? markParteSigned(p, info) : p);
      const allSigned = todasPartesAssinaram(partesAtualizadas);
      const atualizado: Contrato = {
        ...contrato,
        partes: partesAtualizadas,
        signatureStatus: allSigned ? 'assinado' : 'aguardando_assinaturas',
      };
      onUpdateContrato(atualizado);
      await upsertContratoToSupabase(atualizado);
    } finally {
      setConfirmandoId(null);
    }
  };

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const blob = await generateSignedContractPdf(contrato);
      downloadBlob(blob, `contrato-${contrato.numero || contrato.id}-assinado.pdf`);
    } finally {
      setGerandoPdf(false);
    }
  };

  const partesAtuais = contrato.partes || [];
  const todasAssinadas = jaConfigurado && todasPartesAssinaram(partesAtuais);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading font-bold text-lg text-slate-900">Assinatura Eletrônica</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!jaConfigurado ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Tipo de contrato</label>
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => trocarTipo('compra_venda')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${tipo === 'compra_venda' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                    Compra e Venda
                  </button>
                  <button onClick={() => trocarTipo('exclusividade')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${tipo === 'exclusividade' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                    Exclusividade
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {partesForm.filter(p => p.papel !== 'conjuge').map(parte => (
                  <div key={parte.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">
                      {PAPEL_LABEL[parte.papel]} {parte.interna ? '(assina direto no sistema)' : '(assina pelo link, com OTP)'}
                    </p>
                    <input className="input" placeholder="Nome completo *" value={parte.nome}
                      onChange={e => atualizarParte(parte.id, { nome: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input" placeholder="CPF/CNPJ *" value={parte.cpfCnpj}
                        onChange={e => atualizarParte(parte.id, { cpfCnpj: e.target.value })} />
                      <input className="input" placeholder="Telefone (WhatsApp)" value={parte.telefone}
                        onChange={e => atualizarParte(parte.id, { telefone: e.target.value })} />
                    </div>
                    {!parte.interna && (
                      <label className="flex items-center gap-2 text-xs text-slate-600 pt-1 cursor-pointer">
                        <input type="checkbox" checked={!!conjugeAtivo[parte.id]}
                          onChange={() => toggleConjuge(parte.id, parte.papel)} />
                        Incluir cônjuge assinando junto
                      </label>
                    )}
                    {conjugeAtivo[parte.id] && (() => {
                      const conjuge = partesForm.find(p => p.conjugeDeParteId === parte.id);
                      if (!conjuge) return null;
                      return (
                        <div className="pl-3 border-l-2 border-emerald-200 space-y-2 mt-1">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase">Cônjuge de {parte.nome || PAPEL_LABEL[parte.papel]}</p>
                          <input className="input" placeholder="Nome completo do cônjuge *" value={conjuge.nome}
                            onChange={e => atualizarParte(conjuge.id, { nome: e.target.value })} />
                          <input className="input" placeholder="CPF do cônjuge *" value={conjuge.cpfCnpj}
                            onChange={e => atualizarParte(conjuge.id, { cpfCnpj: e.target.value })} />
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Texto do contrato (o que será assinado) *</label>
                <textarea className="input mt-1.5" rows={6} placeholder="Cole aqui o texto integral do contrato..."
                  value={texto} onChange={e => setTexto(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">
                  O hash SHA-256 desse texto é gravado no momento em que a assinatura é iniciada — é a prova de que todas as partes assinaram exatamente o mesmo conteúdo.
                </p>
              </div>

              <button onClick={handleIniciar} disabled={!podeSalvar || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                Iniciar processo de assinatura
              </button>
            </>
          ) : (
            <>
              <div className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                todasAssinadas ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {todasAssinadas ? 'Contrato assinado por todas as partes.' : 'Aguardando assinatura de uma ou mais partes.'}
              </div>

              <div className="space-y-3">
                {partesAtuais.map(parte => (
                  <div key={parte.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{parte.nome}</p>
                        <p className="text-xs text-slate-500">{PAPEL_LABEL[parte.papel]} · {parte.interna ? 'assina no sistema' : 'assina pelo link'}</p>
                      </div>
                      {parte.signedAt ? (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Assinado em {new Date(parte.signedAt).toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                          Pendente
                        </span>
                      )}
                    </div>

                    {!parte.signedAt && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        {parte.interna ? (
                          <button onClick={() => handleConfirmarInterna(parte)} disabled={confirmandoId === parte.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer disabled:opacity-50">
                            {confirmandoId === parte.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Confirmar assinatura
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleGerarOtp(parte)} disabled={gerandoOtpId === parte.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer disabled:opacity-50">
                              {gerandoOtpId === parte.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Gerar código
                            </button>
                            <button onClick={() => handleCopiarLink(parte)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                              {linkCopiadoId === parte.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {linkCopiadoId === parte.id ? 'Link copiado' : 'Copiar link'}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {otpVisivel?.parteId === parte.id && (
                      <div className="mt-2 p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
                        Código gerado: <span className="font-mono font-bold text-sm">{otpVisivel.code}</span>
                        <br />Envie manualmente por WhatsApp/e-mail — esse código não fica salvo em texto puro, só aparece aqui uma vez.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {todasAssinadas && (
                <button onClick={handleBaixarPdf} disabled={gerandoPdf}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer disabled:opacity-50">
                  {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Baixar PDF assinado (com os carimbos)
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; outline: none; width: 100%; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
