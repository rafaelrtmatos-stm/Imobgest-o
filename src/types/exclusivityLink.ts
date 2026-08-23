import { ContratoModularFormData, StatusContratoModular } from './modularContract';
import { CorretorData } from './modularContract';

export type ExclusivityLinkStatus = 
  | 'AGUARDANDO_PREENCHIMENTO'
  | 'PREENCHENDO'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADO'
  | 'EXPIRADO'
  | 'CANCELADO';

export type ExclusivityValidityOption = '30m' | '1h' | '2h' | '24h' | 'custom';

export interface ExclusivityLinkHistoryEvent {
  id: string;
  timestamp: string; // ISO string
  event: 
    | 'LINK_CRIADO'
    | 'LINK_ENVIADO'
    | 'CLIENTE_ACESSOU'
    | 'CLIENTE_INICIOU_PREENCHIMENTO'
    | 'DADOS_PREENCHIDOS'
    | 'CLIENTE_CONFIRMOU_DADOS'
    | 'CONTRATO_GERADO'
    | 'CONTRATO_VISUALIZADO'
    | 'CLIENTE_INICIOU_ASSINATURA'
    | 'CODIGO_CONFIRMADO'
    | 'ASSINATURA_CONCLUIDA'
    | 'PDF_ASSINADO_GERADO'
    | 'DOWNLOAD_REALIZADO';
  description: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface ExclusivityFillLink {
  id: string;
  token: string;
  codigoContrato: string;
  tituloContrato: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  validityConfig: ExclusivityValidityOption;
  validityDurationMinutes: number;
  
  // Dados do corretor responsável
  corretor: CorretorData;

  // Configurações do formulário
  allowClientEditImovel: boolean;
  allowClientEditExclusividade: boolean;

  // Dados pré-definidos pelo corretor (imóvel, exclusividade, blocos ativos)
  initialData: ContratoModularFormData;

  // Dados preenchidos pelo cliente
  clientFilledData?: ContratoModularFormData;

  // Status atual do processo
  status: ExclusivityLinkStatus;

  // Mensagem personalizada do corretor
  customMessage?: string;

  // Dados de congelamento e auditoria da confirmação
  clientConfirmation?: {
    confirmedAt: string;
    clientIp?: string;
    userAgent?: string;
    dataVersion: number;
  };

  // Validação de Identidade (4 últimos dígitos do CPF)
  identityValidation?: {
    last4DigitsCpf: string;
    validatedAt?: string;
    failedAttempts: number;
    maxAttempts: number;
    lockedUntil?: string;
  };

  // Assinatura e Código OTP de 6 dígitos
  signatureData?: {
    confirmationCode: string;
    codeGeneratedAt: string;
    codeExpiresAt: string;
    codeAttempts: number;
    isCodeUsed: boolean;
    signedAt?: string;
    signatureHash?: string;
    clientIp?: string;
    userAgent?: string;
    signedPdfBase64?: string;
    signedDocxBase64?: string;
  };

  // Histórico de auditoria cronológico
  history: ExclusivityLinkHistoryEvent[];
}
