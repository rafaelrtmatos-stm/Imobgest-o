import { 
  ExclusivityFillLink, 
  ExclusivityLinkHistoryEvent, 
  ExclusivityLinkStatus, 
  ExclusivityValidityOption 
} from '../types/exclusivityLink';
import { ContratoModularFormData, ContratoModularRecord } from '../types/modularContract';
import { generateModularDocxBlob, generateModularContractHtml } from './modularDocxProcessor';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const STORAGE_KEY_EXCLUSIVITY_LINKS = 'imobgestao_exclusivity_links_v1';

/**
 * Gera um token aleatório e seguro sem expor dados pessoais na URL
 */
export function generateSecureExclusivityToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'exc';
  let token = `${prefix}_`;
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Converte a opção de validade em minutos
 */
export function getValidityMinutes(option: ExclusivityValidityOption, customHours: number = 24): number {
  switch (option) {
    case '30m':
      return 30;
    case '1h':
      return 60;
    case '2h':
      return 120;
    case '24h':
      return 1440;
    case 'custom':
      return Math.max(15, Math.round(customHours * 60));
    default:
      return 1440;
  }
}

/**
 * Retorna todos os links de exclusividade cadastrados
 */
export function getAllExclusivityLinks(): ExclusivityFillLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXCLUSIVITY_LINKS);
    if (!raw) return [];
    const list: ExclusivityFillLink[] = JSON.parse(raw);
    
    // Atualiza status para 'EXPIRADO' se a validade tiver passado e ainda não estiver assinado
    const now = new Date().getTime();
    let hasChanges = false;
    const updated = list.map(item => {
      if (item.status !== 'ASSINADO' && item.status !== 'CANCELADO') {
        const expTime = new Date(item.expiresAt).getTime();
        if (now > expTime && item.status !== 'EXPIRADO') {
          hasChanges = true;
          return {
            ...item,
            status: 'EXPIRADO' as ExclusivityLinkStatus,
          };
        }
      }
      return item;
    });

    if (hasChanges) {
      saveAllExclusivityLinks(updated);
    }

    return updated;
  } catch (e) {
    console.error('Erro ao ler links de exclusividade do localStorage:', e);
    return [];
  }
}

/**
 * Salva a lista completa no localStorage e dispara evento de sincronização
 */
export function saveAllExclusivityLinks(links: ExclusivityFillLink[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXCLUSIVITY_LINKS, JSON.stringify(links));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('exclusivity_links_updated', { detail: links }));
    }
  } catch (e) {
    console.error('Erro ao salvar links de exclusividade no localStorage:', e);
  }
}

/**
 * Busca link por token único
 */
export function getExclusivityLinkByToken(token: string): ExclusivityFillLink | null {
  const links = getAllExclusivityLinks();
  return links.find(l => l.token === token) || null;
}

/**
 * Cria e persiste um novo link exclusivo para o cliente preencher
 */
export function createExclusivityLink(params: {
  initialFormData: ContratoModularFormData;
  validityConfig: ExclusivityValidityOption;
  customHours?: number;
  allowClientEditImovel?: boolean;
  allowClientEditExclusividade?: boolean;
  customMessage?: string;
}): ExclusivityFillLink {
  const token = generateSecureExclusivityToken();
  const id = `link_exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const codigoContrato = `EXC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  
  const validityMinutes = getValidityMinutes(params.validityConfig, params.customHours || 24);
  const expiresAtDate = new Date(now.getTime() + validityMinutes * 60 * 1000);

  const initialEvent: ExclusivityLinkHistoryEvent = {
    id: `evt_${Date.now()}_1`,
    timestamp: now.toISOString(),
    event: 'LINK_CRIADO',
    description: `Link de preenchimento gerado pelo corretor com validade de ${validityMinutes >= 60 ? (validityMinutes / 60) + ' horas' : validityMinutes + ' minutos'}.`,
    details: {
      validityMinutes,
      allowClientEditImovel: !!params.allowClientEditImovel,
      allowClientEditExclusividade: !!params.allowClientEditExclusividade,
    }
  };

  const newLink: ExclusivityFillLink = {
    id,
    token,
    codigoContrato,
    tituloContrato: params.initialFormData.tituloContrato || 'AUTORIZAÇÃO DE VENDA DE IMÓVEL COM EXCLUSIVIDADE',
    createdAt: now.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    validityConfig: params.validityConfig,
    validityDurationMinutes: validityMinutes,
    corretor: { ...params.initialFormData.corretor },
    allowClientEditImovel: !!params.allowClientEditImovel,
    allowClientEditExclusividade: !!params.allowClientEditExclusividade,
    initialData: JSON.parse(JSON.stringify(params.initialFormData)),
    status: 'AGUARDANDO_PREENCHIMENTO',
    customMessage: params.customMessage,
    history: [initialEvent],
  };

  const links = getAllExclusivityLinks();
  saveAllExclusivityLinks([newLink, ...links]);

  return newLink;
}

/**
 * Atualiza e registra um evento de auditoria no histórico do link
 */
export function recordExclusivityEvent(
  token: string,
  event: ExclusivityLinkHistoryEvent['event'],
  description: string,
  extraDetails?: Record<string, any>,
  newStatus?: ExclusivityLinkStatus
): ExclusivityFillLink | null {
  const links = getAllExclusivityLinks();
  const index = links.findIndex(l => l.token === token);
  if (index === -1) return null;

  const current = links[index];
  const historyEvent: ExclusivityLinkHistoryEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    event,
    description,
    details: extraDetails,
    ip: extraDetails?.ip,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  const updated: ExclusivityFillLink = {
    ...current,
    status: newStatus || current.status,
    history: [historyEvent, ...current.history],
  };

  links[index] = updated;
  saveAllExclusivityLinks(links);
  return updated;
}

/**
 * Atualiza os dados completos de um link
 */
export function updateExclusivityLink(updatedLink: ExclusivityFillLink): void {
  const links = getAllExclusivityLinks();
  const index = links.findIndex(l => l.token === updatedLink.token);
  if (index >= 0) {
    links[index] = updatedLink;
    saveAllExclusivityLinks(links);
  }
}

/**
 * Gera a URL completa pública para o cliente preencher
 */
export function buildExclusivityClientUrl(token: string): string {
  if (typeof window === 'undefined') return `/contrato/preencher/${token}`;
  const origin = window.location.origin;
  return `${origin}/?fill_exclusividade=${token}`;
}

/**
 * Gera mensagem formatada para envio via WhatsApp ou E-mail
 */
export function generateExclusivityInviteMessage(
  clientName: string,
  linkUrl: string,
  customTemplate?: string
): string {
  if (customTemplate && customTemplate.trim()) {
    return customTemplate
      .replace(/\[NOME\]/gi, clientName || 'Cliente')
      .replace(/\[LINK\]/gi, linkUrl);
  }

  const nome = clientName && clientName.trim() ? clientName.trim() : 'Prezado(a) Cliente';

  return `Olá, ${nome}.

Precisamos dos seus dados para preparar o contrato de exclusividade do imóvel.

Clique no link abaixo e preencha os dados solicitados.

LINK:
${linkUrl}

Após preencher, confira as informações e clique em OK.

Depois disso, o sistema apresentará o contrato para leitura e assinatura.`;
}

/**
 * Gera código OTP aleatório de 6 dígitos numéricos
 */
export function generateOtp6Digits(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Formata CPF com pontuação
 */
export function formatCpf(val: string): string {
  const numbers = (val || '').replace(/\D/g, '').substring(0, 11);
  return numbers
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/**
 * Mascara CPF mostrando apenas os 2 primeiros e 2 últimos dígitos
 */
export function maskCpfPrivacy(val: string): string {
  const numbers = (val || '').replace(/\D/g, '');
  if (numbers.length < 11) return '***.***.***-**';
  return `${numbers.substring(0, 3)}.***.***-${numbers.substring(9, 11)}`;
}

/**
 * Formata CEP
 */
export function formatCep(val: string): string {
  const numbers = (val || '').replace(/\D/g, '').substring(0, 8);
  return numbers.replace(/^(\d{5})(\d)/, '$1-$2');
}

/**
 * Formata Telefone / WhatsApp
 */
export function formatPhone(val: string): string {
  const numbers = (val || '').replace(/\D/g, '').substring(0, 11);
  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  }
  return numbers.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
}

/**
 * Converte dados do preenchimento em um ContratoModularRecord persistido no sistema principal
 */
export function saveSignedExclusivityContractToMainRecords(
  link: ExclusivityFillLink,
  docxBlobUrl?: string,
  pdfBlobUrl?: string
): ContratoModularRecord | null {
  const formData = link.clientFilledData || link.initialData;
  const storageKey = 'imobgestao_modular_contracts_v1';
  
  try {
    const raw = localStorage.getItem(storageKey);
    const existing: ContratoModularRecord[] = raw ? JSON.parse(raw) : [];

    const record: ContratoModularRecord = {
      ...formData,
      id: `contrato_exc_${Date.now()}`,
      codigoContrato: link.codigoContrato,
      status: 'ASSINADO',
      createdAt: link.createdAt,
      updatedAt: new Date().toISOString(),
      linkAssinatura: buildExclusivityClientUrl(link.token),
      pdfUrl: pdfBlobUrl,
    };

    const updated = [record, ...existing.filter(e => e.codigoContrato !== link.codigoContrato)];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return record;
  } catch (e) {
    console.error('Erro ao salvar no histórico principal:', e);
    return null;
  }
}
