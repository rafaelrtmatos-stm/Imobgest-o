export type TipoFluxoAssinatura = 
  | 'somente_uma_parte' 
  | 'eu_assino_e_envio' 
  | 'outra_parte_primeiro' 
  | 'duas_partes_simultaneo';

export type StatusAssinaturaContrato = 
  | 'rascunho'
  | 'aguardando_assinatura'
  | 'assinatura_em_andamento'
  | 'assinado_parcialmente'
  | 'aguardando_segunda_parte'
  | 'assinado_por_todas_as_partes'
  | 'cancelado'
  | 'documento_alterado'
  | 'expirado';

export type MetodoAutenticacao = 
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'adicional';

export interface ParteAssinante {
  id: string;
  role: 'parte_1' | 'parte_2' | 'comprador' | 'vendedor_empresa' | 'corretor' | 'testemunha_1' | 'testemunha_2';
  label: string; // Ex: "Parte 1 (Vendedor / Imobiliária)", "Parte 2 (Comprador / Adquirente)"
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  tokenAssinatura: string; // Token único seguro de assinatura, ex: "8F4A-92C1-7B35-4D81"
  status: 'aguardando' | 'visualizado' | 'autenticado' | 'assinado' | 'recusado';
  signedAt?: string; // Data e hora ISO
  signatureId?: string; // ID da assinatura, ex: "8F4A-92C1-7B35-4D81"
  signatureImage?: string | null; // Assinatura gráfica ou rubrica digital
  authMethod?: MetodoAutenticacao;
  authCode?: string;
  ip?: string;
  userAgent?: string;
  dispositivo?: string;
  sistemaOperacional?: string;
  navegador?: string;
  timezone?: string;
  hashDocumento?: string; // Hash SHA-256 do momento da assinatura
}

export type TipoEventoAuditoria = 
  | 'CONTRATO_CRIADO'
  | 'CONTRATO_ENVIADO'
  | 'DOCUMENTO_ABERTO'
  | 'PARTE_1_ABRIU'
  | 'PARTE_1_ASSINOU'
  | 'ASSINATURA_INICIADA'
  | 'IDENTIDADE_CONFIRMADA'
  | 'ASSINATURA_REALIZADA'
  | 'LINK_ENVIADO_PARTE_2'
  | 'PARTE_2_ABRIU'
  | 'PARTE_2_ASSINOU'
  | 'ASSINATURA_2_REALIZADA'
  | 'CONTRATO_FINALIZADO'
  | 'DOCUMENTO_ALTERADO'
  | 'LINK_RECOMPARTILHADO';

export interface EventoAuditoriaAssinatura {
  id: string;
  tipo: TipoEventoAuditoria;
  descricao: string;
  usuario: string;
  dataHora: string; // ISO
  dataHoraFormatada: string;
  ip: string;
  dispositivo: string;
  metadata?: Record<string, any>;
}

export interface VersaoContrato {
  versao: number;
  contractVersionId: string; // ex: "v1", "v2"
  criadaEm: string;
  hashSha256: string;
  documentoHtml: string;
  status: StatusAssinaturaContrato;
  partesSnapshot: ParteAssinante[];
  motivoAlteracao?: string;
}

export interface ContratoAssinaturaDigital {
  id: string; // ID interno do registro de assinatura
  contractId: string; // Ex: Código da Venda "VND-2026-001" ou ID da venda
  saleId?: string;
  contractVersionId: string; // "v1", "v2", etc.
  versao: number;
  titulo: string;
  tipoContrato: string;
  fluxo: TipoFluxoAssinatura;
  status: StatusAssinaturaContrato;
  documentoHtml: string;
  documentoDocxName?: string;
  hashSha256Original: string;
  hashSha256Final?: string;
  partes: ParteAssinante[];
  eventos: EventoAuditoriaAssinatura[];
  qrCodeValidationUrl: string;
  validationToken: string; // Token único de validação, ex: "8F4A-92C1-7B35-4D81"
  qrCodeDataUrl?: string; // Imagem em base64 do QR Code gerado
  createdAt: string;
  updatedAt: string;
  finalizadoEm?: string;
  historicoVersoes?: VersaoContrato[];
}
