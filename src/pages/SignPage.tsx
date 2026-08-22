import React, { useEffect, useState } from 'react';
import { FileSignature, ShieldCheck, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Contrato, ParteContrato } from '../types';
import { fetchContratoById } from '../utils/supabaseClient';
import { checkParteLastDigits, validateVerificationCode, signPartePublic, ValidateCodeReason } from '../utils/signature';
import { formatCurrency, formatDate } from '../utils/formatters';

type Passo = 'carregando' | 'erro' | 'ja_assinado' | 'cpf' | 'termos' | 'otp' | 'concluido';

function getParamsFromUrl(): { contractId: string | null; parteId: string | null } {
  const path = window.location.pathname; // /assinar/:id
  const match = path.match(/\/assinar\/([^/?#]+)/);
  const contractId = match ? decodeURIComponent(match[1]) : null;
  const search = new URLSearchParams(window.location.search);
  return { contractId, parteId: search.get('parte') };
}

export function SignPage() {
  const { contractId, parteId } = getParamsFromUrl();
  const [passo, setPasso] = useState<Passo>('carregando');
  const [erro, setErro] = useState('');
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [parte, setParte] = useState<ParteContrato | null>(null);

  const [ultimos4, setUltimos4] = useState('');
  const [tentativasRestantes, setTentativasRestantes] = useState(5);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [carregandoAcao, setCarregandoAcao] = useState(false);

  useEffect(() => {
    (async () => {
      if (!contractId || !parteId) {
        setErro('Link de assinatura inválido.');
        setPasso('erro');
        return;
      }
      const c = await fetchContratoById(contractId);
      if (!c) {
        setErro('Contrato não encontrado.');
        setPasso('erro');
        return;
      }
      const p = (c.partes || []).find(x => x.id === parteId);
      if (!p) {
        setErro('Parte não encontrada neste contrato.');
        setPasso('erro');
        return;
      }
      setContrato(c);
      setParte(p);
      setPasso(p.signedAt ? 'ja_assinado' : 'cpf');
    })();
  }, []);

  const handleCheckCpf = async () => {
    if (!contrato || !parte || ultimos4.length !== 4) return;
    setCarregandoAcao(true);
    try {
      const res = await checkParteLastDigits(contrato.id, parte.id, ultimos4);
      if (res.matched) {
        setPasso('termos');
      } else if (res.locked) {
        setErro('Número de tentativas excedido. Entre em contato com a imobiliária.');
        setPasso('erro');
      } else {
        setTentativasRestantes(res.attemptsRemaining);
        alert('Os dígitos não conferem. Tente novamente.');
      }
    } finally {
      setCarregandoAcao(false);
    }
  };

  const handleValidarOtp = async () => {
    if (!contrato || !parte || codigo.length !== 6) return;
    setCarregandoAcao(true);
    try {
      const res = await validateVerificationCode(contrato.id, parte.id, codigo);
      if (res.ok === true) {
        const atualizado = await signPartePublic(contrato, parte.id);
        if (atualizado) {
          setContrato(atualizado);
          setPasso('concluido');
        } else {
          setErro('Não foi possível registrar a assinatura. Tente novamente.');
          setPasso('erro');
        }
      } else {
        const reason: ValidateCodeReason = res.reason;
        const msgs: Record<ValidateCodeReason, string> = {
          not_found: 'Nenhum código pendente. Peça para a imobiliária gerar um novo.',
          too_many_attempts: 'Número de tentativas excedido. Peça um novo código.',
          expired: 'Código expirado. Peça um novo código.',
          wrong_code: 'Código incorreto. Tente novamente.',
        };
        alert(msgs[reason] || 'Código inválido.');
      }
    } finally {
      setCarregandoAcao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">IG</div>
          <span className="font-heading font-bold text-slate-900">ImobGestão · Assinatura Eletrônica</span>
        </div>

        {passo === 'carregando' && (
          <div className="py-10 flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" /> Carregando contrato...
          </div>
        )}

        {passo === 'erro' && (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-slate-700">{erro}</p>
          </div>
        )}

        {passo === 'ja_assinado' && (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <p className="text-sm text-slate-700">Este contrato já foi assinado por {parte?.nome}.</p>
          </div>
        )}

        {contrato && parte && (passo === 'cpf' || passo === 'termos' || passo === 'otp') && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-400 uppercase font-semibold">{contrato.titulo}</p>
              <p className="text-sm text-slate-700">Nº {contrato.numero} · {formatDate(contrato.dataContrato)} · {formatCurrency(contrato.valor)}</p>
              <p className="text-xs text-slate-500 mt-1">Você está assinando como: <strong>{parte.nome}</strong></p>
            </div>

            {passo === 'cpf' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confirme sua identidade
                </p>
                <p className="text-xs text-slate-500">Digite os 4 últimos dígitos do seu CPF/CNPJ.</p>
                <input className="input" maxLength={4} inputMode="numeric" placeholder="0000"
                  value={ultimos4} onChange={e => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                {tentativasRestantes < 5 && <p className="text-xs text-amber-600">Tentativas restantes: {tentativasRestantes}</p>}
                <button onClick={handleCheckCpf} disabled={ultimos4.length !== 4 || carregandoAcao}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg cursor-pointer">
                  {carregandoAcao && <Loader2 className="w-4 h-4 animate-spin" />} Continuar
                </button>
              </div>
            )}

            {passo === 'termos' && (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap border border-slate-100 rounded-lg p-3 bg-slate-50">
                  {contrato.textoContrato || 'Texto do contrato não disponível.'}
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)} />
                  Li e concordo com os termos deste contrato.
                </label>
                <button onClick={() => setPasso('otp')} disabled={!aceitouTermos}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg cursor-pointer">
                  Continuar para o código de verificação
                </button>
              </div>
            )}

            {passo === 'otp' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-emerald-600" /> Digite o código de 6 dígitos
                </p>
                <p className="text-xs text-slate-500">O código foi enviado pela imobiliária via WhatsApp ou e-mail.</p>
                <input className="input tracking-widest text-center font-mono text-lg" maxLength={6} inputMode="numeric"
                  placeholder="000000" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                <button onClick={handleValidarOtp} disabled={codigo.length !== 6 || carregandoAcao}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg cursor-pointer">
                  {carregandoAcao && <Loader2 className="w-4 h-4 animate-spin" />} Assinar contrato
                </button>
              </div>
            )}
          </div>
        )}

        {passo === 'concluido' && (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <p className="font-semibold text-slate-800">Assinatura registrada com sucesso!</p>
            <p className="text-xs text-slate-500">Você já pode fechar esta página.</p>
          </div>
        )}
      </div>
      <style>{`.input { border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.6rem 0.75rem; font-size: 0.9rem; outline: none; width: 100%; } .input:focus { box-shadow: 0 0 0 2px #10b98166; border-color:#10b981; }`}</style>
    </div>
  );
}
