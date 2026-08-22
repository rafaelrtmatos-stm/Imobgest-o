import { getSupabaseClient, upsertContratoToSupabase } from './supabaseClient';
import { Contrato, ParteContrato } from '../types';

// ---------- Hash e IDs (mesma lógica do fluxo genérico, portada 1:1) ----------

/** SHA-256 hex de qualquer texto — usado tanto pro código OTP quanto pro hash do documento. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** ID exclusivo de UMA assinatura (formato "XXXX-XXXX-XXXX-XXXX"). Gerado uma vez por parte. */
export function generateSignatureId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  return hex.match(/.{1,4}/g)!.join('-');
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------- Checagem dos últimos 4 dígitos do CPF/CNPJ (via RPC no banco) ----------

export interface CheckDigitsResult {
  matched: boolean;
  locked: boolean;
  attemptsRemaining: number;
}

/**
 * Compara os últimos 4 dígitos DENTRO do banco (RPC) — o CPF/CNPJ completo nunca
 * trafega até o navegador do cliente antes da assinatura.
 */
export async function checkParteLastDigits(
  contractId: string,
  parteId: string,
  lastDigits: string
): Promise<CheckDigitsResult> {
  const client = getSupabaseClient();
  if (!client) return { matched: false, locked: false, attemptsRemaining: 0 };

  const { data, error } = await client.rpc('check_contrato_parte_last_digits', {
    p_contract_id: contractId,
    p_parte_id: parteId,
    p_last_digits: lastDigits,
  });

  if (error || !data) return { matched: false, locked: false, attemptsRemaining: 0 };
  return {
    matched: !!data.matched,
    locked: !!data.locked,
    attemptsRemaining: data.attempts_remaining ?? 0,
  };
}

// ---------- Código OTP (gerado pelo admin, enviado manualmente) ----------

/**
 * Gera um novo código de 6 dígitos para uma parte externa e salva só o HASH no banco.
 * O código em texto puro só existe aqui, no momento da geração — o admin copia e envia
 * manualmente (WhatsApp/e-mail). Qualquer código anterior ainda não usado é invalidado.
 */
export async function createVerificationCode(
  contractId: string,
  parteId: string,
  ttlMinutes = 30
): Promise<{ code: string; expiresAt: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  await client
    .from('verification_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('contract_id', contractId)
    .eq('parte_id', parteId)
    .eq('is_used', false);

  const code = generateOtpCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const { error } = await client.from('verification_codes').insert({
    contract_id: contractId,
    parte_id: parteId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (error) return null;
  return { code, expiresAt }; // "code" só existe aqui — nunca salvo em texto puro
}

export type ValidateCodeReason = 'not_found' | 'too_many_attempts' | 'expired' | 'wrong_code';

/** Valida o código digitado pelo cliente na página pública (com limite de tentativas). */
export async function validateVerificationCode(
  contractId: string,
  parteId: string,
  inputCode: string
): Promise<{ ok: true } | { ok: false; reason: ValidateCodeReason }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'not_found' };

  const inputHash = await sha256Hex(inputCode);
  const { data, error } = await client.rpc('validate_verification_code', {
    p_contract_id: contractId,
    p_parte_id: parteId,
    p_code_hash: inputHash,
  });

  if (error || !data) return { ok: false, reason: 'not_found' };
  if (data.ok) return { ok: true };
  return { ok: false, reason: (data.reason ?? 'not_found') as ValidateCodeReason };
}

// ---------- Assinatura de uma parte (interna ou externa) ----------

/** Descobre IP/user-agent do navegador do cliente (best-effort, sem serviço próprio). */
export async function getClientNetworkInfo(): Promise<{ ip: string; userAgent: string }> {
  const userAgent = navigator.userAgent;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const json = await res.json();
    return { ip: json.ip || 'desconhecido', userAgent };
  } catch {
    return { ip: 'desconhecido', userAgent };
  }
}

/** Marca uma parte como assinada, gerando o ID exclusivo desta assinatura. */
export function markParteSigned(
  parte: ParteContrato,
  info: { ip: string; userAgent: string }
): ParteContrato {
  return {
    ...parte,
    signedAt: new Date().toISOString(),
    signerIp: info.ip,
    signerUserAgent: info.userAgent,
    signatureId: generateSignatureId(),
  };
}

/** Todas as partes obrigatórias (não-cônjuge) já assinaram? Cônjuges contam se existirem. */
export function todasPartesAssinaram(partes: ParteContrato[]): boolean {
  if (!partes.length) return false;
  return partes.every((p) => !!p.signedAt);
}

/** Gera o link público de assinatura para uma parte específica. */
export function buildSignUrl(contratoId: string, parteId: string): string {
  return `${window.location.origin}/assinar/${contratoId}?parte=${parteId}`;
}

/**
 * Usado pela página pública: marca a parte como assinada e persiste direto no Supabase
 * (não há sessão/estado local nessa página, ela roda fora do app principal).
 */
export async function signPartePublic(contrato: Contrato, parteId: string): Promise<Contrato | null> {
  const info = await getClientNetworkInfo();
  const partes = (contrato.partes || []).map((p) => (p.id === parteId ? markParteSigned(p, info) : p));
  const allSigned = todasPartesAssinaram(partes);
  const updated: Contrato = {
    ...contrato,
    partes,
    signatureStatus: allSigned ? 'assinado' : 'aguardando_assinaturas',
    updatedAt: new Date().toISOString(),
  };
  const saved = await upsertContratoToSupabase(updated);
  return saved ? updated : null;
}
