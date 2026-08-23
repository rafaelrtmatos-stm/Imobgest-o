export type { EstadoCivil } from './index';
import type { EstadoCivil } from './index';

export type StatusContratoModular = 
  | 'RASCUNHO'
  | 'GERADO'
  | 'ENVIADO'
  | 'AGUARDANDO ASSINATURAS'
  | 'PARCIALMENTE ASSINADO'
  | 'ASSINADO'
  | 'CANCELADO';

export interface ModularBlocksConfig {
  contratante: boolean;
  conjuge: boolean;
  corretor: boolean;
  imovel: boolean;
  documentacaoImovel: boolean;
  precoCondicoes: boolean;
  exclusividade: boolean;
  autorizacaoVisitas: boolean;
  autorizacaoDivulgacao: boolean;
  autorizacaoPlaca: boolean;
  autorizacaoFotosVideos: boolean;
  autorizacaoPortaisRedes: boolean;
  comissao: boolean;
  parceriaCorretores: boolean;
  protecaoInteressados: boolean;
  prazo: boolean;
  rescisao: boolean;
  foro: boolean;
  assinaturas: boolean;
}

export interface SignatariosConfig {
  contratante: boolean;
  conjuge: boolean;
  corretor: boolean;
  testemunha1: boolean;
  testemunha2: boolean;
}

export interface ContratanteData {
  nome: string;
  estadoCivil: EstadoCivil;
  profissao: string;
  cpf: string;
  rg: string;
  endereco: string;
  telefone: string;
  email?: string;
  nacionalidade?: string;
}

export interface ConjugeData {
  nome: string;
  cpf: string;
  rg: string;
  profissao?: string;
  regimeBens?: string;
}

export interface CorretorData {
  nome: string;
  cpfCnpj: string;
  creci: string;
  endereco: string;
  telefone: string;
  email?: string;
}

export interface ImovelData {
  tipoImovel: string;
  localizacao: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  areaM2?: string;
  lote?: string;
  quadra?: string;
  empreendimento?: string;
}

export interface DocumentacaoImovelData {
  documentoPropriedade: string;
  matricula: string;
  inscricaoMunicipal: string;
  cartorio?: string;
  outrosDados: string;
}

export interface PrecoCondicoesData {
  precoVenda: number;
  condicoesPagamento: string;
  observacoesComerciais: string;
  valorEntrada?: number;
  quantidadeParcelas?: number;
  valorParcela?: number;
}

export interface ExclusividadeData {
  dataInicio: string; // YYYY-MM-DD
  prazoDias: number;
  dataTermino: string; // calculada automaticamente
  tipoContratacao: string;
  precoAutorizadoVenda: number;
  percentualComissao: number;
  valorComissao: number; // calculado automaticamente
  condicoesPagamentoAutorizadas: string;
  observacoesExclusividade: string;
}

export interface ProtecaoInteressadosData {
  prazoProtecaoDias: number;
  observacoes: string;
}

export interface ComissaoData {
  percentual: number;
  valorVenda: number;
  valorComissao: number; // calculado automaticamente
  formaPagamentoComissao: string;
}

export interface PrazoContratoData {
  dataInicio: string; // YYYY-MM-DD
  quantidadeDias: number;
  dataTermino: string; // calculada automaticamente
}

export interface RescisaoData {
  multaRescisoriaPercentual?: number;
  avisoPrevioDias?: number;
  textoClausula?: string;
}

export interface ForoData {
  comarca: string;
  uf: string;
}

export interface TestemunhaData {
  nome: string;
  cpf: string;
}

export interface AssinaturasData {
  signatarios: SignatariosConfig;
  testemunha1: TestemunhaData;
  testemunha2: TestemunhaData;
}

export interface ContratoModularFormData {
  id?: string;
  tituloContrato: string;
  templateDocxId?: string;
  status: StatusContratoModular;
  dataEmissao: string;
  blocks: ModularBlocksConfig;
  contratante: ContratanteData;
  conjuge: ConjugeData;
  corretor: CorretorData;
  imovel: ImovelData;
  documentacaoImovel: DocumentacaoImovelData;
  precoCondicoes: PrecoCondicoesData;
  exclusividade: ExclusividadeData;
  autorizacaoVisitasTexto?: string;
  autorizacaoDivulgacaoTexto?: string;
  parceriaCorretoresTexto?: string;
  protecaoInteressados: ProtecaoInteressadosData;
  comissao: ComissaoData;
  prazo: PrazoContratoData;
  rescisao: RescisaoData;
  foro: ForoData;
  assinaturas: AssinaturasData;
  observacoesGerais?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContratoModularRecord extends ContratoModularFormData {
  id: string;
  codigoContrato: string;
  createdAt: string;
  updatedAt: string;
  docxBase64?: string;
  pdfUrl?: string;
  assinaturaId?: string;
  linkAssinatura?: string;
}
