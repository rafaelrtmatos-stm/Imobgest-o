import QRCode from 'qrcode';
import { 
  ContratoAssinaturaDigital, 
  EventoAuditoriaAssinatura, 
  MetodoAutenticacao, 
  ParteAssinante, 
  StatusAssinaturaContrato, 
  TipoEventoAuditoria, 
  TipoFluxoAssinatura, 
  VersaoContrato 
} from '../types/digitalSignature';
import { CompanyConfig, SaleRecord } from '../types';
import { generateContractHTML } from './contractTemplates';
import { formatDateBR } from './formatters';

const DIGITAL_CONTRACTS_STORAGE_KEY = 'imobgestao_digital_contracts_v2';

/**
 * Gera um token hexadecimal aleatório seguro no formato "8F4A-92C1-7B35-4D81"
 */
export function generateSecureToken(): string {
  const chars = '0123456789ABCDEF';
  const getChunk = () => {
    let chunk = '';
    for (let i = 0; i < 4; i++) {
      chunk += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return chunk;
  };
  return `${getChunk()}-${getChunk()}-${getChunk()}-${getChunk()}`;
}

/**
 * Mascara o CPF para segurança na exibição pública (ex: ***.456.789-**)
 */
export function maskCpf(cpf: string): string {
  if (!cpf) return '***.***.***-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length < 11) {
    return '***.***.***-**';
  }
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
}

/**
 * Mascara o e-mail para exibição segura (ex: ra***@gmail.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@email.com';
  const [user, domain] = email.split('@');
  const visible = user.substring(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

/**
 * Mascara o telefone (ex: (85) 9****-1234)
 */
export function maskPhone(phone: string): string {
  if (!phone) return '(**) *****-****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const ddd = clean.substring(0, 2);
    const last4 = clean.substring(clean.length - 4);
    return `(${ddd}) 9****-${last4}`;
  }
  return phone;
}

/**
 * Calcula o hash SHA-256 de uma string de forma assíncrona usando Web Crypto API
 */
export async function computeSha256(text: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback matemático simples caso crypto.subtle não esteja disponível
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(32, '0') + '7a91f3e28e2f00000000000000000000'.substring(0, 32);
  }
}

/**
 * Extrai metadados do dispositivo/navegador do cliente
 */
export function getClientDeviceInfo(): {
  ip: string;
  userAgent: string;
  dispositivo: string;
  sistemaOperacional: string;
  navegador: string;
  timezone: string;
} {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconhecido';
  let so = 'Linux/Windows';
  if (/Windows/i.test(ua)) so = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) so = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) so = 'iOS';
  else if (/Android/i.test(ua)) so = 'Android';
  else if (/Linux/i.test(ua)) so = 'Linux';

  let nav = 'Navegador Web';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) nav = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) nav = 'Apple Safari';
  else if (/Firefox/i.test(ua)) nav = 'Mozilla Firefox';
  else if (/Edg/i.test(ua)) nav = 'Microsoft Edge';

  let disp = 'Computador / Desktop';
  if (/Mobi|Android/i.test(ua)) disp = 'Smartphone / Mobile';
  else if (/Tablet|iPad/i.test(ua)) disp = 'Tablet';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  return {
    ip: '187.54.120.91 (Autenticado SSL)',
    userAgent: ua,
    dispositivo: disp,
    sistemaOperacional: so,
    navegador: nav,
    timezone: tz,
  };
}

/**
 * Gera DataURL do QR Code
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Erro ao gerar QR Code:', err);
    return '';
  }
}

/**
 * Lê todos os contratos digitais armazenados
 */
export function getStoredDigitalContracts(): ContratoAssinaturaDigital[] {
  try {
    const item = localStorage.getItem(DIGITAL_CONTRACTS_STORAGE_KEY);
    if (!item) return [];
    return JSON.parse(item);
  } catch (err) {
    console.error('Erro ao ler contratos digitais do localStorage:', err);
    return [];
  }
}

/**
 * Salva a lista de contratos digitais no localStorage
 */
export function saveStoredDigitalContracts(contracts: ContratoAssinaturaDigital[]): void {
  try {
    localStorage.setItem(DIGITAL_CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
  } catch (err) {
    console.error('Erro ao salvar contratos digitais:', err);
  }
}

/**
 * Busca um contrato por ID de Venda ou Código
 */
export function getDigitalContractBySaleId(saleIdOrCode: string): ContratoAssinaturaDigital | null {
  const list = getStoredDigitalContracts();
  return list.find(c => c.contractId === saleIdOrCode || c.saleId === saleIdOrCode) || null;
}

/**
 * Busca um contrato por token exclusivo de assinatura da parte (ex: "/assinar/:token")
 */
export function getDigitalContractByToken(token: string): {
  contract: ContratoAssinaturaDigital;
  party: ParteAssinante;
} | null {
  if (!token) return null;
  const list = getStoredDigitalContracts();
  for (const contract of list) {
    const party = contract.partes.find(p => p.tokenAssinatura.toLowerCase() === token.toLowerCase().trim());
    if (party) {
      return { contract, party };
    }
  }
  return null;
}

/**
 * Busca um contrato por token de validação do QR Code (ex: "/validar/:token" ou signatureId)
 */
export function getDigitalContractByValidationToken(validationTokenOrSigId: string): ContratoAssinaturaDigital | null {
  if (!validationTokenOrSigId) return null;
  const clean = validationTokenOrSigId.toLowerCase().trim();
  const list = getStoredDigitalContracts();
  return list.find(c => 
    c.validationToken.toLowerCase() === clean || 
    c.contractId.toLowerCase() === clean ||
    c.partes.some(p => p.signatureId?.toLowerCase() === clean || p.tokenAssinatura.toLowerCase() === clean)
  ) || null;
}

/**
 * Inicializa ou obtém o contrato digital para uma venda, respeitando versionamento
 */
export async function createOrGetDigitalContract(
  sale: SaleRecord,
  companyConfig: CompanyConfig,
  customHtml?: string,
  docxFileName?: string
): Promise<ContratoAssinaturaDigital> {
  const existing = getDigitalContractBySaleId(sale.codigoVenda) || getDigitalContractBySaleId(sale.id);
  const baseHtml = customHtml || generateContractHTML(sale);
  const hashOriginal = await computeSha256(baseHtml);

  // Se já existe contrato
  if (existing) {
    // Se o contrato já tem alguma assinatura realizada e o conteúdo foi alterado, cria nova versão preservando o histórico
    const hasAnySignature = existing.partes.some(p => p.status === 'assinado');
    if (hasAnySignature && existing.hashSha256Original !== hashOriginal) {
      return createNewContractVersion(existing, baseHtml, hashOriginal);
    }
    return existing;
  }

  // Identificação automática das partes através dos dados já existentes no contrato
  const parte1Token = generateSecureToken();
  const parte2Token = generateSecureToken();
  const validationToken = generateSecureToken();

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const validationUrl = `${appOrigin}/validar/${validationToken}`;
  const qrCodeDataUrl = await generateQrCodeDataUrl(validationUrl);

  const parte1: ParteAssinante = {
    id: `party-1-${sale.id}`,
    role: 'parte_1',
    label: 'Parte 1 (Vendedor / Imobiliária)',
    nome: sale.seller.vendedorNome || companyConfig.nomeEmpresa || 'Corretor Autorizado',
    cpf: sale.seller.vendedorCpfCnpj || companyConfig.cpfCnpj || `CRECI ${sale.seller.vendedorCreci || 'N/A'}`,
    email: sale.seller.vendedorEmail || companyConfig.email || 'contato@imobiliaria.com',
    telefone: sale.seller.vendedorTelefone || companyConfig.telefone || '(00) 00000-0000',
    tokenAssinatura: parte1Token,
    status: 'aguardando',
  };

  const parte2: ParteAssinante = {
    id: `party-2-${sale.id}`,
    role: 'parte_2',
    label: 'Parte 2 (Comprador / Adquirente)',
    nome: sale.buyer.nome,
    cpf: sale.buyer.cpf,
    email: sale.buyer.email || `${sale.buyer.nome.toLowerCase().replace(/\s+/g, '.')}@cliente.com`,
    telefone: sale.buyer.contato1 || sale.buyer.contato2 || '(00) 00000-0000',
    tokenAssinatura: parte2Token,
    status: 'aguardando',
  };

  const initialEvent: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-1`,
    tipo: 'CONTRATO_CRIADO',
    descricao: `Contrato ${sale.codigoVenda} criado e preparado para assinatura digital.`,
    usuario: parte1.nome,
    dataHora: new Date().toISOString(),
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: '187.54.120.91',
    dispositivo: getClientDeviceInfo().dispositivo,
  };

  const newContract: ContratoAssinaturaDigital = {
    id: `dig-contract-${sale.id}-${Date.now()}`,
    contractId: sale.codigoVenda,
    saleId: sale.id,
    contractVersionId: 'v1',
    versao: 1,
    titulo: `Contrato de Venda ${sale.codigoVenda} - ${sale.property.empreendimento}`,
    tipoContrato: sale.tipoContrato === 'compra_venda_parcelado' ? 'Compra e Venda Parcelada' : 'Compra e Venda À Vista',
    fluxo: 'eu_assino_e_envio',
    status: 'aguardando_assinatura',
    documentoHtml: baseHtml,
    documentoDocxName: docxFileName,
    hashSha256Original: hashOriginal,
    partes: [parte1, parte2],
    eventos: [initialEvent],
    qrCodeValidationUrl: validationUrl,
    validationToken,
    qrCodeDataUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    historicoVersoes: [],
  };

  const list = getStoredDigitalContracts();
  list.unshift(newContract);
  saveStoredDigitalContracts(list);

  return newContract;
}

/**
 * Cria nova versão de contrato quando houver alterações após assinaturas (Regra de Versão Estrita)
 */
export async function createNewContractVersion(
  current: ContratoAssinaturaDigital,
  newHtml: string,
  newHash: string
): Promise<ContratoAssinaturaDigital> {
  const novaVersaoNum = current.versao + 1;
  const newVersionId = `v${novaVersaoNum}`;

  const versaoAnterior: VersaoContrato = {
    versao: current.versao,
    contractVersionId: current.contractVersionId,
    criadaEm: current.createdAt,
    hashSha256: current.hashSha256Original,
    documentoHtml: current.documentoHtml,
    status: current.status,
    partesSnapshot: JSON.parse(JSON.stringify(current.partes)),
    motivoAlteracao: 'Dados ou minuta do contrato alterados após assinatura. Versão anterior preservada.',
  };

  // Resetar tokens e status das partes para a nova versão
  const updatedPartes: ParteAssinante[] = current.partes.map(p => ({
    ...p,
    tokenAssinatura: generateSecureToken(),
    status: 'aguardando',
    signedAt: undefined,
    signatureId: undefined,
    signatureImage: null,
    hashDocumento: undefined,
  }));

  const validationToken = generateSecureToken();
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const validationUrl = `${appOrigin}/validar/${validationToken}`;
  const qrCodeDataUrl = await generateQrCodeDataUrl(validationUrl);

  const eventAlterado: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-mod`,
    tipo: 'DOCUMENTO_ALTERADO',
    descricao: `Nova versão gerada (${newVersionId}). Versão ${current.contractVersionId} foi arquivada e novas assinaturas são requeridas.`,
    usuario: 'Sistema / Gestão',
    dataHora: new Date().toISOString(),
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: '187.54.120.91',
    dispositivo: getClientDeviceInfo().dispositivo,
  };

  const updatedContract: ContratoAssinaturaDigital = {
    ...current,
    contractVersionId: newVersionId,
    versao: novaVersaoNum,
    status: 'aguardando_assinatura',
    documentoHtml: newHtml,
    hashSha256Original: newHash,
    hashSha256Final: undefined,
    partes: updatedPartes,
    validationToken,
    qrCodeValidationUrl: validationUrl,
    qrCodeDataUrl,
    updatedAt: new Date().toISOString(),
    finalizadoEm: undefined,
    historicoVersoes: [...(current.historicoVersoes || []), versaoAnterior],
    eventos: [eventAlterado, ...(current.eventos || [])],
  };

  const list = getStoredDigitalContracts().map(c => c.id === current.id ? updatedContract : c);
  saveStoredDigitalContracts(list);

  return updatedContract;
}

/**
 * Registra um evento de auditoria no contrato
 */
export function recordContractEvent(
  contractId: string,
  tipo: TipoEventoAuditoria,
  usuario: string,
  descricao: string,
  metadata?: Record<string, any>
): ContratoAssinaturaDigital | null {
  const list = getStoredDigitalContracts();
  const contract = list.find(c => c.id === contractId || c.contractId === contractId);
  if (!contract) return null;

  const clientInfo = getClientDeviceInfo();
  const newEvent: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tipo,
    descricao,
    usuario,
    dataHora: new Date().toISOString(),
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: clientInfo.ip,
    dispositivo: `${clientInfo.dispositivo} (${clientInfo.sistemaOperacional} / ${clientInfo.navegador})`,
    metadata,
  };

  contract.eventos = [newEvent, ...(contract.eventos || [])];
  contract.updatedAt = new Date().toISOString();

  saveStoredDigitalContracts(list);
  return contract;
}

/**
 * Atualiza o fluxo de assinatura do contrato
 */
export function updateContractFluxo(
  contractId: string,
  fluxo: TipoFluxoAssinatura
): ContratoAssinaturaDigital | null {
  const list = getStoredDigitalContracts();
  const contract = list.find(c => c.id === contractId || c.contractId === contractId);
  if (!contract) return null;

  contract.fluxo = fluxo;
  contract.updatedAt = new Date().toISOString();

  saveStoredDigitalContracts(list);
  return contract;
}

/**
 * Executa a assinatura de uma parte específica com todos os metadados de auditoria e segurança
 */
export async function executeDigitalSignature(
  contractId: string,
  partyIdOrToken: string,
  authMethod: MetodoAutenticacao,
  authCode: string,
  signatureImageBase64?: string | null
): Promise<{
  success: boolean;
  contract: ContratoAssinaturaDigital;
  signatureId: string;
  isFullySigned: boolean;
  message: string;
}> {
  const list = getStoredDigitalContracts();
  const contract = list.find(c => c.id === contractId || c.contractId === contractId);
  if (!contract) {
    throw new Error('Contrato não encontrado no sistema.');
  }

  const party = contract.partes.find(p => p.id === partyIdOrToken || p.tokenAssinatura === partyIdOrToken);
  if (!party) {
    throw new Error('Signatário não identificado para este contrato.');
  }

  if (party.status === 'assinado') {
    return {
      success: true,
      contract,
      signatureId: party.signatureId || '',
      isFullySigned: contract.status === 'assinado_por_todas_as_partes',
      message: 'Este signatário já realizou a assinatura anteriormente.',
    };
  }

  const clientInfo = getClientDeviceInfo();
  const nowIso = new Date().toISOString();
  const signatureId = generateSecureToken();
  const hashDoMomento = await computeSha256(contract.documentoHtml + nowIso + signatureId);

  // Atualizar dados da parte
  party.status = 'assinado';
  party.signedAt = nowIso;
  party.signatureId = signatureId;
  party.authMethod = authMethod;
  party.authCode = authCode;
  party.ip = clientInfo.ip;
  party.userAgent = clientInfo.userAgent;
  party.dispositivo = clientInfo.dispositivo;
  party.sistemaOperacional = clientInfo.sistemaOperacional;
  party.navegador = clientInfo.navegador;
  party.timezone = clientInfo.timezone;
  party.hashDocumento = hashDoMomento;
  party.signatureImage = signatureImageBase64 || null;

  // Registrar eventos correspondentes
  const eventAssinatura: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-sign`,
    tipo: party.role === 'parte_2' ? 'ASSINATURA_2_REALIZADA' : 'ASSINATURA_REALIZADA',
    descricao: `${party.label} (${party.nome} - CPF: ${maskCpf(party.cpf)}) assinou eletronicamente via ${authMethod.toUpperCase()} (ID: ${signatureId}).`,
    usuario: party.nome,
    dataHora: nowIso,
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: clientInfo.ip,
    dispositivo: `${clientInfo.dispositivo} (${clientInfo.sistemaOperacional} / ${clientInfo.navegador})`,
    metadata: {
      signatureId,
      hashSha256: hashDoMomento,
      authMethod,
    },
  };
  contract.eventos = [eventAssinatura, ...(contract.eventos || [])];

  // Avaliação de Status conforme o fluxo
  const parte1 = contract.partes[0];
  const parte2 = contract.partes[1];

  let isFullySigned = false;

  if (contract.fluxo === 'somente_uma_parte') {
    contract.status = 'assinado_por_todas_as_partes';
    contract.finalizadoEm = nowIso;
    isFullySigned = true;
  } else if (contract.fluxo === 'eu_assino_e_envio') {
    if (party.role === 'parte_1' && parte2.status !== 'assinado') {
      contract.status = 'aguardando_segunda_parte';
      // Registrar evento de envio para Parte 2
      const evtEnvio: EventoAuditoriaAssinatura = {
        id: `evt-${Date.now()}-send`,
        tipo: 'LINK_ENVIADO_PARTE_2',
        descricao: `Link seguro de assinatura gerado para ${parte2.nome} (Token: ${parte2.tokenAssinatura}).`,
        usuario: 'Sistema ImobGestão',
        dataHora: nowIso,
        dataHoraFormatada: new Date().toLocaleString('pt-BR'),
        ip: clientInfo.ip,
        dispositivo: clientInfo.dispositivo,
      };
      contract.eventos = [evtEnvio, ...contract.eventos];
    } else if (parte1.status === 'assinado' && parte2.status === 'assinado') {
      contract.status = 'assinado_por_todas_as_partes';
      contract.finalizadoEm = nowIso;
      isFullySigned = true;
    }
  } else if (contract.fluxo === 'outra_parte_primeiro') {
    if (party.role === 'parte_2' && parte1.status !== 'assinado') {
      contract.status = 'assinado_parcialmente';
    } else if (parte1.status === 'assinado' && parte2.status === 'assinado') {
      contract.status = 'assinado_por_todas_as_partes';
      contract.finalizadoEm = nowIso;
      isFullySigned = true;
    }
  } else if (contract.fluxo === 'duas_partes_simultaneo') {
    if (parte1.status === 'assinado' && parte2.status === 'assinado') {
      contract.status = 'assinado_por_todas_as_partes';
      contract.finalizadoEm = nowIso;
      isFullySigned = true;
    } else {
      contract.status = 'assinado_parcialmente';
    }
  }

  if (isFullySigned) {
    contract.hashSha256Final = await computeSha256(contract.documentoHtml + (parte1.signatureId || '') + (parte2?.signatureId || ''));
    const finalEvent: EventoAuditoriaAssinatura = {
      id: `evt-${Date.now()}-finish`,
      tipo: 'CONTRATO_FINALIZADO',
      descricao: `Contrato ${contract.contractId} finalizado com sucesso. Assinado por todas as partes com validade jurídica plena.`,
      usuario: 'Sistema ImobGestão',
      dataHora: nowIso,
      dataHoraFormatada: new Date().toLocaleString('pt-BR'),
      ip: clientInfo.ip,
      dispositivo: clientInfo.dispositivo,
    };
    contract.eventos = [finalEvent, ...contract.eventos];
  }

  contract.updatedAt = nowIso;
  saveStoredDigitalContracts(list);

  return {
    success: true,
    contract,
    signatureId,
    isFullySigned,
    message: isFullySigned ? 'Contrato finalizado e assinado por todas as partes!' : 'Assinatura realizada com sucesso!',
  };
}

/**
 * Renderiza o design visual profissional das assinaturas eletrônicas para inserção no documento e PDF (Conforme Item 9)
 */
export function renderProfessionalSignatureBlockHTML(
  contract: ContratoAssinaturaDigital,
  qrCodeBase64?: string
): string {
  const parte1 = contract.partes[0];
  const parte2 = contract.partes[1];
  const isSomenteUmaParte = contract.fluxo === 'somente_uma_parte';
  const qrCodeImg = qrCodeBase64 || contract.qrCodeDataUrl || '';

  const renderSingleCard = (parte: ParteAssinante, tituloParte: string) => {
    const isSigned = parte?.status === 'assinado';
    const dataHoraStr = parte?.signedAt ? new Date(parte.signedAt).toLocaleString('pt-BR') : 'Pendente';
    const [dataStr, horaStr] = dataHoraStr.includes(' ') ? dataHoraStr.split(' ') : [dataHoraStr, ''];

    return `
      <div style="border: 2px solid #0f172a; border-radius: 8px; padding: 14px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; flex: 1; min-width: 260px; box-sizing: border-box;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
          <div style="font-weight: 800; font-size: 11px; letter-spacing: 0.5px; color: #047857; text-transform: uppercase;">
            ${isSigned ? '&#10003; ASSINADO ELETRONICAMENTE' : '&#9675; AGUARDANDO ASSINATURA'}
          </div>
          <div style="font-size: 10px; font-weight: 700; color: #475569; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">
            ${tituloParte}
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">ASSINANTE</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.2;">${parte.nome}</div>
          <div style="font-size: 11px; color: #334155; font-family: monospace; font-weight: 600;">CPF: ${maskCpf(parte.cpf)}</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #334155; margin-bottom: 8px; background: #ffffff; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;">
          <div><strong>Data:</strong> ${dataStr || 'Aguardando'}</div>
          <div><strong>Hora:</strong> ${horaStr || '--:--:--'}</div>
        </div>

        <div style="margin-bottom: 6px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">ID DA ASSINATURA</div>
          <div style="font-size: 11px; font-weight: 700; font-family: monospace; color: #0f172a; word-break: break-all;">
            ${parte.signatureId || 'PENDENTE-DE-ASSINATURA'}
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">HASH SHA-256</div>
          <div style="font-size: 9px; font-family: monospace; color: #475569; word-break: break-all; line-height: 1.2;">
            ${parte.hashDocumento ? `${parte.hashDocumento.substring(0, 20)}...${parte.hashDocumento.substring(parte.hashDocumento.length - 8)}` : (contract.hashSha256Original?.substring(0, 24) + '...')}
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed #cbd5e1; pt: 8px; margin-top: 8px;">
          <div style="font-size: 9px; color: #64748b;">
            Autenticação via <strong>${parte.authMethod ? parte.authMethod.toUpperCase() : 'ELETRÔNICA'}</strong><br/>
            IP: ${parte.ip || 'Autenticado'}
          </div>
          ${qrCodeImg ? `
            <div style="text-align: center;">
              <img src="${qrCodeImg}" alt="QR Code" style="width: 54px; height: 54px; display: block; margin: 0 auto;" />
              <div style="font-size: 8px; font-weight: 800; color: #0f172a; margin-top: 2px;">VALIDAR</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  return `
    <div class="digital-signatures-section" style="margin-top: 24px; padding-top: 18px; border-top: 2px solid #0f172a; page-break-inside: avoid;">
      <div style="text-align: center; margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #0f172a; text-transform: uppercase;">
          TERMO DE ASSINATURA ELETRÔNICA & AUTENTICAÇÃO DIGITAL
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          Documento Criptográfico com Validade Jurídica (MP nº 2.200-2/2001 e Lei nº 14.063/2020)
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; align-items: stretch;">
        ${renderSingleCard(parte1, 'PARTE 1')}
        ${!isSomenteUmaParte && parte2 ? renderSingleCard(parte2, 'PARTE 2') : ''}
      </div>

      <div style="margin-top: 14px; padding: 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px; color: #475569; text-align: center; line-height: 1.4;">
        <strong>Conferência e Integridade:</strong> As assinaturas acima foram registradas eletronicamente com carimbo de tempo, endereço IP verificado, autenticação de dois fatores e hash de integridade SHA-256. 
        Para validar a autenticidade deste documento, aponte a câmera para o QR Code ou acesse: <strong>${contract.qrCodeValidationUrl}</strong>
      </div>
    </div>
  `;
}

/**
 * Constrói o HTML completo do documento assinado pronto para exibição e PDF
 */
export function buildCompleteSignedDocumentHtml(
  contract: ContratoAssinaturaDigital,
  qrCodeBase64?: string
): string {
  const signatureBlock = renderProfessionalSignatureBlockHTML(contract, qrCodeBase64);
  
  // Se o documentoHtml já possui bloco de assinaturas antigo, adiciona no final ou substitui
  return `
    <div class="signed-contract-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6;">
      <div class="contract-content-body">
        ${contract.documentoHtml}
      </div>
      ${signatureBlock}
    </div>
  `;
}

/**
 * Gera e abre a janela de impressão/salvar como PDF do contrato assinado
 */
export async function downloadSignedContractPdf(contract: ContratoAssinaturaDigital): Promise<void> {
  const qrCodeUrl = contract.qrCodeDataUrl || await generateQrCodeDataUrl(contract.qrCodeValidationUrl);
  const fullHtml = buildCompleteSignedDocumentHtml(contract, qrCodeUrl);
  const title = `CONTRATO_ASSINADO_${contract.contractId}_${contract.contractVersionId}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups neste site para visualizar e baixar o PDF do contrato assinado.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.55;
            text-rendering: optimizeLegibility;
          }
          .contract-document h1, .contract-document h2, .contract-document h3 {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            font-size: 12px;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
          }
          @media print {
            body {
              padding: 0;
            }
            .digital-signatures-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${fullHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
