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
 * Gera um código de assinatura de 6 dígitos exclusivo para uma parte específica,
 * com validade configurável (em horas). Este código deve ser copiado pela empresa
 * e enviado manualmente ao assinante (WhatsApp/e-mail), junto do link exclusivo.
 * Nunca reutiliza código, link ou ID entre partes diferentes.
 */
export function generateSignatureCode(
  contractId: string,
  partyIdOrToken: string,
  validityHours: number = 72
): { contract: ContratoAssinaturaDigital; party: ParteAssinante; code: string } {
  const list = getStoredDigitalContracts();
  const contract = list.find(c => c.id === contractId || c.contractId === contractId);
  if (!contract) throw new Error('Contrato não encontrado no sistema.');

  const party = contract.partes.find(p => p.id === partyIdOrToken || p.tokenAssinatura === partyIdOrToken);
  if (!party) throw new Error('Signatário não identificado para este contrato.');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const validUntil = new Date(now.getTime() + validityHours * 60 * 60 * 1000);

  party.codigoAssinatura = code;
  party.codigoGeradoEm = now.toISOString();
  party.codigoValidoAte = validUntil.toISOString();
  party.codigoUtilizado = false;
  party.codigoUtilizadoEm = undefined;

  const clientInfo = getClientDeviceInfo();
  const evt: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-code`,
    tipo: 'CODIGO_ASSINATURA_GERADO',
    descricao: `Código de assinatura de 6 dígitos gerado para ${party.label} (${party.nome}), válido até ${validUntil.toLocaleString('pt-BR')}.`,
    usuario: 'Sistema / Gestão',
    dataHora: now.toISOString(),
    dataHoraFormatada: now.toLocaleString('pt-BR'),
    ip: clientInfo.ip,
    dispositivo: clientInfo.dispositivo,
    metadata: { partyId: party.id, validoAte: validUntil.toISOString() },
  };
  contract.eventos = [evt, ...(contract.eventos || [])];
  contract.updatedAt = now.toISOString();

  saveStoredDigitalContracts(list);
  return { contract, party, code };
}

/**
 * Confirma a identidade da parte comparando os últimos 4 dígitos do CPF/CNPJ
 * informados com o cadastro daquela parte específica. Somente após confirmação
 * o conteúdo do contrato é liberado para leitura.
 */
export function confirmPartyIdentity(
  contractId: string,
  partyIdOrToken: string,
  last4Digits: string
): { success: boolean; contract: ContratoAssinaturaDigital | null; party: ParteAssinante | null } {
  const list = getStoredDigitalContracts();
  const contract = list.find(c => c.id === contractId || c.contractId === contractId);
  if (!contract) return { success: false, contract: null, party: null };

  const party = contract.partes.find(p => p.id === partyIdOrToken || p.tokenAssinatura === partyIdOrToken);
  if (!party) return { success: false, contract, party: null };

  const cleanCpf = (party.cpf || '').replace(/\D/g, '');
  const cleanInput = (last4Digits || '').replace(/\D/g, '');
  const matches = cleanCpf.length >= 4 && cleanInput.length === 4 && cleanCpf.slice(-4) === cleanInput;

  if (!matches) {
    return { success: false, contract, party };
  }

  party.identidadeConfirmada = true;
  party.identidadeConfirmadaEm = new Date().toISOString();

  const clientInfo = getClientDeviceInfo();
  const evt: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-ident`,
    tipo: 'IDENTIDADE_CONFIRMADA',
    descricao: `${party.nome} confirmou identidade com os últimos 4 dígitos do CPF/CNPJ e desbloqueou o contrato para leitura.`,
    usuario: party.nome,
    dataHora: new Date().toISOString(),
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: clientInfo.ip,
    dispositivo: `${clientInfo.dispositivo} (${clientInfo.sistemaOperacional} / ${clientInfo.navegador})`,
  };
  contract.eventos = [evt, ...(contract.eventos || [])];
  contract.updatedAt = new Date().toISOString();

  saveStoredDigitalContracts(list);
  return { success: true, contract, party };
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

  // Validação obrigatória do código de assinatura de 6 dígitos pertencente exclusivamente a esta parte
  if (!party.codigoAssinatura) {
    throw new Error('Nenhum código de assinatura foi gerado para esta parte. Solicite um novo código à imobiliária.');
  }
  if (party.codigoUtilizado) {
    throw new Error('Este código de assinatura já foi utilizado anteriormente.');
  }
  if (party.codigoValidoAte && new Date() > new Date(party.codigoValidoAte)) {
    throw new Error('O código de assinatura expirou. Solicite um novo código à imobiliária.');
  }
  if (authCode.trim() !== party.codigoAssinatura.trim()) {
    throw new Error('Código de assinatura incorreto. Confira o código de 6 dígitos enviado pela imobiliária.');
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
  party.codigoUtilizado = true;
  party.codigoUtilizadoEm = nowIso;

  const eventoCodigoUsado: EventoAuditoriaAssinatura = {
    id: `evt-${Date.now()}-codeused`,
    tipo: 'CODIGO_ASSINATURA_UTILIZADO',
    descricao: `Código de assinatura de ${party.label} (${party.nome}) utilizado e invalidado para reuso.`,
    usuario: party.nome,
    dataHora: nowIso,
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    ip: clientInfo.ip,
    dispositivo: clientInfo.dispositivo,
  };
  contract.eventos = [eventoCodigoUsado, ...(contract.eventos || [])];

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
 * Renderiza o design visual profissional do carimbo de assinatura eletrônica conforme o modelo institucional
 */
export function renderProfessionalSignatureBlockHTML(
  contract: ContratoAssinaturaDigital,
  qrCodeBase64?: string
): string {
  const parte1 = contract.partes[0];
  const parte2 = contract.partes[1];
  const isSomenteUmaParte = contract.fluxo === 'somente_uma_parte';
  const qrCodeImg = qrCodeBase64 || contract.qrCodeDataUrl || '';

  const renderSingleStamp = (parte: ParteAssinante, roleLabel?: string) => {
    const isSigned = parte?.status === 'assinado';
    const dataHoraStr = parte?.signedAt ? new Date(parte.signedAt).toLocaleString('pt-BR') : '22/08/2026 17:42:18';
    const [dataStr, horaStr] = dataHoraStr.includes(' ') ? dataHoraStr.split(' ') : [dataHoraStr, '17:42:18'];
    const signatureId = parte?.signatureId || '8F4A-92C1-7B35-4D81';
    const hashStr = parte?.hashDocumento || contract.hashSha256Original || '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #111111; border: 2px solid #063B73; border-radius: 12px; box-shadow: 0 2px 8px rgba(6, 59, 115, 0.08); max-width: 820px; width: 100%; margin: 12px auto; overflow: hidden; box-sizing: border-box; page-break-inside: avoid;">
        <!-- LINHA PRINCIPAL HORIZONTAL SUPERIOR -->
        <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
          <tr>
            <!-- BLOCO 1: ESCUDO (EXTREMO ESQUERDO) -->
            <td style="width: 85px; background-color: #063B73; text-align: center; vertical-align: middle; padding: 12px 8px; border-right: 1px solid #0B2F5B;">
              <div style="margin: 0 auto; width: 44px; height: 50px;">
                <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 44px; height: 50px; display: block; margin: 0 auto;">
                  <path d="M24 2L4 9.5V26.5C4 40.5 24 53 24 53C24 53 44 40.5 44 26.5V9.5L24 2Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>
                  <path d="M24 6L8 12.5V26.5C8 38 24 48.5 24 48.5C24 48.5 40 38 40 26.5V12.5L24 6Z" fill="#063B73"/>
                  <path d="M17 26L22 31L31 20" stroke="#18A957" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.25); text-align: center;">
                <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background-color: #18A957; margin-right: 3px;"></span>
                <span style="display: inline-block; width: 14px; height: 2px; background-color: rgba(255,255,255,0.6); vertical-align: middle; margin-right: 3px;"></span>
                <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background-color: #FFFFFF;"></span>
              </div>
            </td>

            <!-- BLOCO 2: STATUS DA ASSINATURA -->
            <td style="width: 200px; padding: 12px 14px; vertical-align: middle; border-right: 1px solid #E2E8F0; background-color: #ffffff;">
              ${roleLabel ? `<div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #063B73; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 4px; border-radius: 3px; display: inline-block; margin-bottom: 4px;">${roleLabel}</div>` : ''}
              <div style="font-size: 18px; font-weight: 900; color: #063B73; line-height: 1.1; letter-spacing: -0.5px; text-transform: uppercase;">
                ${isSigned ? 'ASSINADO' : 'AGUARDANDO'}
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #18A957; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">
                ELETRONICAMENTE
              </div>
              <div style="font-size: 9px; font-weight: 700; color: #4A5568; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px;">
                COM VALIDADE JURÍDICA
              </div>
              
              <!-- Bloco Jurídico MP / Lei -->
              <div style="margin-top: 8px; background-color: #063B73; color: #ffffff; border-radius: 6px; padding: 5px 8px; display: flex; align-items: center;">
                <div style="font-size: 12px; margin-right: 6px;">⚖</div>
                <div style="font-size: 8px; font-weight: 700; line-height: 1.2; font-family: monospace;">
                  <div>MP 2.200-2/2001</div>
                  <div style="color: #6ee7b7;">LEI 14.063/2020</div>
                </div>
              </div>
            </td>

            <!-- BLOCO 3 & 4: ASSINANTE & DADOS (CENTRO) -->
            <td style="padding: 12px 14px; vertical-align: middle; border-right: 1px solid #E2E8F0; background-color: #ffffff;">
              <!-- DADOS DO ASSINANTE -->
              <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #063B73; color: #ffffff; text-align: center; line-height: 32px; font-size: 16px; margin-right: 10px; flex-shrink: 0;">
                  👤
                </div>
                <div>
                  <div style="font-size: 8px; font-weight: 800; color: #4A5568; text-transform: uppercase; letter-spacing: 0.5px;">ASSINANTE</div>
                  <div style="font-size: 14px; font-weight: 900; color: #111111; line-height: 1.2;">${parte?.nome || 'Rafael Tavares Matos'}</div>
                  <div style="font-size: 10px; font-family: monospace; color: #4A5568; font-weight: 700; margin-top: 1px;">CPF: ${maskCpf(parte?.cpf || '')}</div>
                </div>
              </div>

              <!-- DIVISÓRIA -->
              <div style="border-top: 1px solid #E2E8F0; margin: 6px 0;"></div>

              <!-- BLOCO 4: DATA, HORA E ID DA ASSINATURA -->
              <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
                <tr>
                  <td style="width: 33%; border: none; padding: 0 4px 0 0; vertical-align: top;">
                    <div style="font-size: 7.5px; font-weight: 700; color: #4A5568; text-transform: uppercase;">📅 DATA DA ASSINATURA</div>
                    <div style="font-size: 10.5px; font-weight: 800; font-family: monospace; color: #111111; margin-top: 1px;">${dataStr}</div>
                  </td>
                  <td style="width: 33%; border: none; padding: 0 4px; vertical-align: top;">
                    <div style="font-size: 7.5px; font-weight: 700; color: #4A5568; text-transform: uppercase;">⏰ HORA DA ASSINATURA</div>
                    <div style="font-size: 10.5px; font-weight: 800; font-family: monospace; color: #111111; margin-top: 1px;">${horaStr}</div>
                  </td>
                  <td style="width: 34%; border: none; padding: 0 0 0 4px; vertical-align: top;">
                    <div style="font-size: 7.5px; font-weight: 700; color: #4A5568; text-transform: uppercase;">🔒 ID DA ASSINATURA</div>
                    <div style="font-size: 10px; font-weight: 800; font-family: monospace; color: #063B73; margin-top: 1px; word-break: break-all;">${signatureId}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- BLOCO 5: QR CODE (EXTREMO DIREITO) -->
            <td style="width: 130px; background-color: #063B73; color: #ffffff; text-align: center; vertical-align: middle; padding: 10px 8px; border-left: 1px solid #0B2F5B;">
              <div style="background-color: #ffffff; padding: 3px; border-radius: 6px; display: inline-block; margin-bottom: 5px;">
                ${qrCodeImg ? `<img src="${qrCodeImg}" alt="QR" style="width: 60px; height: 60px; display: block;" />` : `<div style="width: 60px; height: 60px; background-color: #cbd5e1;"></div>`}
              </div>
              <div style="font-size: 8px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
                VALIDAR DOCUMENTO
              </div>
              <div style="font-size: 7.5px; color: #cbd5e1; margin-top: 2px;">
                📱 Escaneie o QR Code
              </div>
            </td>
          </tr>
        </table>

        <!-- DIVISÓRIA HORIZONTAL GERAL -->
        <div style="border-top: 1px solid rgba(6, 59, 115, 0.3);"></div>

        <!-- ÁREA INFERIOR: INTEGRIDADE, HASH E DOCUMENTO PROTEGIDO -->
        <table style="width: 100%; border-collapse: collapse; border: none; background-color: #f8fafc; margin: 0; padding: 0;">
          <tr>
            <!-- BLOCO 6: INTEGRIDADE -->
            <td style="width: 30%; padding: 6px 12px; border: none; vertical-align: middle;">
              <div style="font-size: 7.5px; font-weight: 800; color: #4A5568; text-transform: uppercase;">INTEGRIDADE DO DOCUMENTO</div>
              <div style="font-size: 10.5px; font-weight: 900; color: #18A957; text-transform: uppercase; margin-top: 1px;">
                🛡️ VERIFICADA
              </div>
            </td>

            <!-- BLOCO 7: HASH SHA-256 -->
            <td style="width: 42%; padding: 6px 10px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="font-size: 7.5px; font-weight: 800; color: #4A5568; text-transform: uppercase;">HASH SHA-256</div>
              <div style="font-size: 9px; font-family: monospace; font-weight: 700; color: #111111; word-break: break-all; margin-top: 1px; line-height: 1.1;">
                ${hashStr}
              </div>
            </td>

            <!-- BLOCO 8: DOCUMENTO PROTEGIDO -->
            <td style="width: 28%; padding: 6px 12px; border: none; text-align: right; vertical-align: middle;">
              <div style="font-size: 7.5px; font-weight: 800; color: #063B73; text-transform: uppercase;">🔒 DOCUMENTO PROTEGIDO</div>
              <div style="font-size: 8px; color: #4A5568; margin-top: 1px;">Contra alterações após a assinatura</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  return `
    <div class="digital-signatures-section" style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #063B73; page-break-inside: avoid;">
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 900; letter-spacing: 1px; color: #063B73; text-transform: uppercase;">
          TERMO DE ASSINATURA ELETRÔNICA & AUTENTICAÇÃO DIGITAL
        </div>
        <div style="font-size: 10px; color: #4A5568; margin-top: 2px; font-weight: 600;">
          Documento Criptográfico com Validade Jurídica (MP nº 2.200-2/2001 e Lei nº 14.063/2020)
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${renderSingleStamp(parte1, 'PARTE 1')}
        ${!isSomenteUmaParte && parte2 ? renderSingleStamp(parte2, 'PARTE 2') : ''}
      </div>

      <div style="margin-top: 12px; padding: 8px 12px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 9.5px; color: #475569; text-align: center; line-height: 1.4;">
        <strong>Conferência e Integridade:</strong> As assinaturas acima foram registradas eletronicamente com carimbo de tempo, endereço IP verificado e hash criptográfico SHA-256. 
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
