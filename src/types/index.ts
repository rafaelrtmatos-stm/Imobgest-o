export type EstadoCivil = 
  | 'Solteiro(a)'
  | 'Casado(a)'
  | 'Divorciado(a)'
  | 'Viúvo(a)'
  | 'União Estável'
  | 'Separado(a)';

export type TipoPagamento = 'a_vista' | 'parcelado';

export type TipoContrato = 
  | 'a_vista'
  | 'parcelado'
  | 'exclusividade'
  | 'recibo_quitacao_a_vista'
  | 'compra_venda_a_vista' 
  | 'compra_venda_parcelado' 
  | 'exclusividade_casas'
  | 'corretagem_cliente';

export type StatusVenda = 
  | 'rascunho' 
  | 'pendente_assinatura' 
  | 'assinado' 
  | 'concluido' 
  | 'cancelado';

export type StatusComissao = 'pendente' | 'paga' | 'parcial';

export type StatusLote = 'disponivel' | 'reservado' | 'vendido';

export type OrigemCampo = 
  | 'Cliente' 
  | 'Cônjuge' 
  | 'Empreendimento' 
  | 'Lote' 
  | 'Venda' 
  | 'Corretor' 
  | 'Configuração' 
  | 'Campo manual';

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento?: string;
  estadoCivil: EstadoCivil;
  profissao: string;
  nacionalidade: string;
  telefone?: string;
  contato1?: string;
  contato2?: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado?: string;
  uf?: string;
  // Cônjuge
  nomeConjuge?: string;
  cpfConjuge?: string;
  rgConjuge?: string;
  estadoCivilConjuge?: EstadoCivil;
  profissaoConjuge?: string;
  regimeBens?: string;
  observacoes?: string;
  // Metadados
  createdAt: string;
  updatedAt: string;
}

export interface BuyerData {
  clienteId?: string;
  nome: string;
  rg: string;
  cpf: string;
  dataNascimento: string;
  estadoCivil: EstadoCivil;
  profissao: string;
  nacionalidade: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  contato1: string; // WhatsApp / Telefone Principal
  contato2: string; // Telefone Secundário / Recado
  email?: string;
  nomeConjuge?: string;
  cpfConjuge?: string;
  rgConjuge?: string;
  estadoCivilConjuge?: EstadoCivil;
  profissaoConjuge?: string;
  regimeBens?: string;
}

export interface PropertyData {
  empreendimento: string;
  empreendimentoId: string;
  quadra: string;
  lote: string;
  areaM2: number;
  tipoImovel?: string; // ex: Terreno Urbano, Lote Residencial
  localizacaoImovel?: string; // ex: Rua das Acácias, Lote 12, Quadra 05
  documentoPropriedade?: string; // ex: Escritura Pública / Matrícula Geral
  outrosDadosImovel?: string;
  frenteMetros?: number;
  fundoMetros?: number;
  ladoDireitoMetros?: number;
  ladoEsquerdoMetros?: number;
  confrontacoes?: {
    frente?: string;
    fundo?: string;
    direita?: string;
    esquerda?: string;
  };
  matricula?: string;
  registroCartorio?: string;
  cidade: string;
  uf: string;
}

export interface FinancialData {
  tipoPagamento: TipoPagamento;
  valorTotal: number;
  entrada: number;
  quantidadeParcelas: number;
  dataVencimento: string; // DD/MM/AAAA ou Dia do Vencimento
  diaVencimento?: string | number;
  valorParcela: number;
  valorUltimaParcela?: number; // Ajuste de centavos na última parcela
  dataPrimeiraParcela?: string;
  taxaJurosMensal: number; // ex: 0.5% ou 0 para juros simples/fixo
  indiceReajuste: 'IPCA' | 'IGP-M' | 'INPC' | 'Fixo';
  formaPagamentoEntrada: 'Pix' | 'Boleto' | 'TED' | 'Cheque' | 'Dinheiro' | 'Cartão' | 'À VISTA';
  observacoesFinanceiras?: string;
  // Para contratos de corretagem / exclusividade
  condicoesPagamento?: string;
  percentualCorretagem?: number; // ex: 7%
  prazoExclusividadeDias?: number; // ex: 90 dias
  dataTerminoExclusividade?: string;
}

export interface SellerData {
  vendedorId: string;
  vendedorNome: string;
  vendedorCpfCnpj?: string;
  vendedorCreci: string;
  vendedorTelefone: string;
  vendedorEmail: string;
  vendedorEndereco?: string;
  comissaoPercentual: number; // ex: 5
  comissaoValor: number;
  comissaoStatus: StatusComissao;
  dataPrevisaoPagamento?: string;
}

export interface SignatureParty {
  name: string;
  role: 'Comprador(a)' | 'Cônjuge' | 'Corretor(a) / Vendedor(a)' | 'Testemunha 1' | 'Testemunha 2';
  documentNumber: string;
  signatureImage: string | null; // base64
  signedAt: string | null;
  ipAddress?: string;
  authMethod?: 'Assinatura Eletrônica na Tela' | 'Certificado ICP-Brasil' | 'Validação por SMS/WhatsApp';
}

export interface SignatureData {
  buyer: SignatureParty;
  spouse?: SignatureParty;
  seller: SignatureParty;
  witness1?: SignatureParty;
  witness2?: SignatureParty;
  isFullySigned: boolean;
  contractHash?: string;
  lastSignedDate?: string;
}

export interface SaleRecord {
  id: string;
  codigoVenda: string;
  createdAt: string;
  updatedAt: string;
  status: StatusVenda;
  tipoContrato: TipoContrato;
  buyer: BuyerData;
  property: PropertyData;
  financial: FinancialData;
  seller: SellerData;
  signatures: SignatureData;
  observacoes?: string;
  clienteId?: string; // Vínculo com cliente
  loteId?: string; // Vínculo com lote
  contratoId?: string; // Vínculo com contrato
}

export interface LoteData {
  id: string;
  numero: string;
  lote?: string; // Alias para numero
  quadra: string;
  area: number;
  frente: number;
  fundo: number;
  valor: number;
  status: StatusLote;
  empreendimentoId?: string;
  clienteId?: string;
  compradorNome?: string;
  vendaId?: string;
  contratoId?: string;
  observacoes?: string;
  coordenadasSVG?: { x: number; y: number; width: number; height: number; rotate?: number };
  dotPosition?: { x: number; y: number }; // porcentagem ou coordenada absoluta no mapa PDF
}

export interface QuadraData {
  id: string;
  numero: string;
  nomeRua?: string;
  coordenadasSVG?: { x: number; y: number; width: number; height: number };
  lotes: LoteData[];
}

export interface Empreendimento {
  id: string;
  nome: string;
  localizacao: string;
  bairro?: string;
  cidade: string;
  uf: string;
  estado?: string; // Alias para uf
  descricao: string;
  matriculaGeral: string;
  cartorioRegistro: string;
  totalLotes: number;
  imagemUrl?: string;
  mapaPdfUrl?: string;
  mapaCustomImage?: string;
  areaTotalM2?: number;
  engenheiroResponsavel?: string;
  creaNumero?: string;
  escalaPlanta?: string;
  // Dados Geográficos & GPS
  latitude?: number;
  longitude?: number;
  cep?: string;
  enderecoCompleto?: string;
  pontosReferencia?: string;
  googleMapsUrl?: string;
  zona?: 'Urbana' | 'Expansão Urbana' | 'Rural' | 'Especial';
  infraestrutura?: string[];
  informacoes?: string;
  quadras: QuadraData[];
}

export interface Corretor {
  id: string;
  nome: string;
  creci: string;
  telefone: string;
  email: string;
  comissaoPadraoPercentual: number;
  fotoUrl?: string;
  totalVendas?: number;
  chavePix?: string;
  banco?: string;
  cidadeAtuacao?: string;
  status?: 'ativo' | 'inativo';
}

export interface CompanyConfig {
  nomeEmpresa: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  creci: string;
  // Local de Assinatura padrão
  cidadeAssinatura: string;
  estadoAssinatura: string;
}

export type UserRole = 'admin' | 'gerente' | 'corretor' | 'financeiro';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  role: UserRole;
  telefone?: string;
  creci?: string;
  cargo?: string;
  status: 'ativo' | 'inativo';
  avatar?: string;
  ultimoAcesso?: string;
  criadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoModeloDocumento = 
  | 'recibo_quitacao' 
  | 'compromisso_parcelado' 
  | 'exclusividade_casas'
  | 'terreno_a_vista' 
  | 'terreno_parcelado' 
  | 'corretagem_exclusividade'
  | 'venda_a_vista' 
  | 'venda_parcelada' 
  | 'recibo' 
  | 'contrato' 
  | 'outro';

export interface DocumentFieldMapping {
  rawTag: string; // Ex: {nome_comprador} ou [COMPRADOR]
  cleanTag: string; // Ex: nome_comprador ou COMPRADOR
  systemFieldId: string; // Ex: comprador_nome
  systemFieldLabel: string; // Ex: Nome do Comprador
  status: 'reconhecido' | 'nao_reconhecido';
  origem?: OrigemCampo; // Origem selecionada pelo usuário se desconhecido
  customDescription?: string;
  customDefaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  nome: string; // Ex: "Contrato de Terreno à Vista"
  tipoDocumento: TipoModeloDocumento;
  tipo?: string; // Alias amigável para exibição
  descricao?: string;
  fileName: string; // Ex: "contrato-vista.docx"
  fileBase64?: string; // Binário base64 do docx para download e processamento
  rawText: string;
  contentHtml?: string;
  tags: DocumentFieldMapping[];
  customMappings?: Record<string, string>; // rawTag -> systemFieldId ou valor customizado
  isDefault?: boolean;
  ativo?: boolean;
  createdAt: string;
  updatedAt: string;
}
