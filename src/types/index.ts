export type StatusContrato = 'ativo' | 'concluido' | 'cancelado';
export type StatusVenda = 'pendente' | 'confirmada' | 'cancelada';

/** Tipo do contrato — define quem são as partes que assinam. */
export type TipoContrato = 'compra_venda' | 'exclusividade';

/** Papel de cada parte dentro do contrato de assinatura. */
export type PapelParte = 'vendedor' | 'comprador' | 'contratante' | 'contratado' | 'conjuge';

export type StatusAssinatura = 'nao_iniciado' | 'aguardando_assinaturas' | 'assinado';

/**
 * Uma parte que assina o contrato (pessoa física/jurídica).
 * `interna` = a imobiliária/operador, assina direto no sistema (sem OTP).
 * `interna = false` = assina remoto pelo link público /assinar/:id, com checagem de
 * CPF/CNPJ + código OTP enviado manualmente pelo admin.
 */
export interface ParteContrato {
  id: string;
  papel: PapelParte;
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  interna: boolean;
  conjugeDeParteId?: string; // preenchido quando papel === 'conjuge'

  // preenchido somente após a assinatura desta parte
  signedAt?: string;
  signerIp?: string;
  signerUserAgent?: string;
  signatureId?: string; // ID exclusivo desta assinatura (formato XXXX-XXXX-XXXX-XXXX)
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venda {
  id: string;
  contratoId: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  status: StatusVenda;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contrato {
  id: string;
  numero: string;
  clienteId: string;
  titulo: string;
  dataContrato: string; // AAAA-MM-DD
  valor: number;
  status: StatusContrato;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;

  // ---- Assinatura eletrônica ----
  tipoContrato?: TipoContrato;
  textoContrato?: string; // texto exibido/assinado na página pública
  partes?: ParteContrato[];
  documentHash?: string; // SHA-256 do textoContrato, gravado no fechamento (2ª assinatura)
  signatureStatus?: StatusAssinatura;
  pdfUrl?: string;
}
