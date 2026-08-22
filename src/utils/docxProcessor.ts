import JSZip from 'jszip';
import mammoth from 'mammoth';
import { DocumentFieldMapping, DocumentTemplate, SaleRecord, TipoModeloDocumento } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  formatDateExtenso, 
  valorPorExtenso, 
  percentualPorExtenso, 
  calcularParcelamentoAjustado,
  getDiaAssinatura,
  getMesAssinaturaExtenso,
  getAnoAssinatura
} from './formatters';
import { getStoredCompanyConfig } from './storage';

export interface SystemFieldDefinition {
  id: string;
  label: string;
  category: 'Vendedor/Corretor' | 'Comprador' | 'Cônjuge' | 'Imóvel/Lote' | 'Financeiro' | 'Datas e Geral' | 'Assinaturas';
  description: string;
  aliases: string[]; // variações para reconhecimento automático
  exampleValue: string;
}

export const SYSTEM_FIELDS_CATALOG: SystemFieldDefinition[] = [
  // VENDEDOR / CORRETOR / CONTRATADO
  {
    id: 'vendedor_nome',
    label: 'Nome do Vendedor / Corretor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Nome completo do corretor ou contratado',
    aliases: [
      'VENDEDOR', 'NOME_VENDEDOR', 'CORRETOR', 'NOME_CORRETOR', 
      'VENDEDOR_NOME', 'CORRETOR_NOME', 'NOME_CONTRATADO', 'CONTRATADO_NOME', 'CONTRATADO'
    ],
    exampleValue: 'Roberto Silva Albuquerque',
  },
  {
    id: 'vendedor_cpf_cnpj',
    label: 'CPF / CNPJ do Vendedor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Documento CPF ou CNPJ do corretor ou empresa contratada',
    aliases: ['CPF_CNPJ_CONTRATADO', 'CPF_VENDEDOR', 'CNPJ_VENDEDOR', 'CPF_CNPJ_VENDEDOR', 'DOC_VENDEDOR', 'CPF_CORRETOR'],
    exampleValue: '28.910.450/0001-90',
  },
  {
    id: 'vendedor_creci',
    label: 'CRECI do Vendedor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Número de inscrição no CRECI',
    aliases: ['CRECI', 'CRECI_VENDEDOR', 'CRECI_CORRETOR', 'VENDEDOR_CRECI', 'CRECI_CONTRATADO'],
    exampleValue: 'CRECI-PA 4810-J',
  },
  {
    id: 'vendedor_endereco',
    label: 'Endereço do Vendedor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Endereço comercial ou residencial do corretor/contratado',
    aliases: ['ENDERECO_CONTRATADO', 'ENDERECO_VENDEDOR', 'VENDEDOR_ENDERECO'],
    exampleValue: 'Av. Mendonça Furtado, nº 1.450, Centro, Santarém - PA',
  },
  {
    id: 'vendedor_telefone',
    label: 'Telefone do Vendedor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Telefone(s) de contato do corretor/contratado',
    aliases: [
      'TELEFONE_VENDEDOR', 'CONTATO_VENDEDOR', 'FONE_VENDEDOR', 
      'VENDEDOR_TELEFONE', 'WHATSAPP_VENDEDOR', 'TELEFONES_CONTRATADO', 'TELEFONE_CONTRATADO'
    ],
    exampleValue: '(93) 3522-8800',
  },
  {
    id: 'vendedor_email',
    label: 'E-mail do Vendedor / Contratado',
    category: 'Vendedor/Corretor',
    description: 'Endereço eletrônico do corretor/contratado',
    aliases: ['EMAIL_VENDEDOR', 'VENDEDOR_EMAIL', 'EMAIL_CONTRATADO'],
    exampleValue: 'roberto.imoveis@imobgestao.com.br',
  },

  // COMPRADOR / CONTRATANTE
  {
    id: 'comprador_nome',
    label: 'Nome do Comprador / Contratante',
    category: 'Comprador',
    description: 'Nome civil completo do comprador ou contratante',
    aliases: [
      'COMPRADOR', 'NOME_COMPRADOR', 'CLIENTE', 'NOME_CLIENTE', 
      'COMPRADOR_NOME', 'PROMITENTE_COMPRADOR', 'NOME_CONTRATANTE', 'CONTRATANTE_NOME', 'CONTRATANTE'
    ],
    exampleValue: 'Carlos Alberto Silva',
  },
  {
    id: 'comprador_cpf',
    label: 'CPF do Comprador / Contratante',
    category: 'Comprador',
    description: 'CPF do comprador ou contratante formatado',
    aliases: ['CPF', 'CPF_COMPRADOR', 'COMPRADOR_CPF', 'DOC_COMPRADOR', 'NUMERO_CPF', 'CPF_CONTRATANTE'],
    exampleValue: '123.456.789-00',
  },
  {
    id: 'comprador_rg',
    label: 'RG do Comprador / Contratante',
    category: 'Comprador',
    description: 'Documento de identidade do comprador ou contratante',
    aliases: ['RG', 'RG_COMPRADOR', 'COMPRADOR_RG', 'IDENTIDADE_COMPRADOR', 'RG_CONTRATANTE'],
    exampleValue: '4.892.110 SSP/GO',
  },
  {
    id: 'comprador_estadocivil',
    label: 'Estado Civil do Comprador / Contratante',
    category: 'Comprador',
    description: 'Estado civil informado (ex: Casado(a), Solteiro(a))',
    aliases: ['ESTADOCIVIL', 'ESTADO_CIVIL', 'ESTADO_CIVIL_COMPRADOR', 'COMPRADOR_ESTADOCIVIL', 'ESTADO_CIVIL_CONTRATANTE'],
    exampleValue: 'Casado(a)',
  },
  {
    id: 'comprador_nacionalidade',
    label: 'Nacionalidade do Comprador',
    category: 'Comprador',
    description: 'Nacionalidade do comprador',
    aliases: ['NACIONALIDADE', 'NACIONALIDADE_COMPRADOR', 'COMPRADOR_NACIONALIDADE'],
    exampleValue: 'Brasileira',
  },
  {
    id: 'comprador_profissao',
    label: 'Profissão do Comprador / Contratante',
    category: 'Comprador',
    description: 'Ocupação profissional do comprador ou contratante',
    aliases: ['PROFISSAO', 'PROFISSAO_COMPRADOR', 'COMPRADOR_PROFISSAO', 'PROFISSAO_CONTRATANTE'],
    exampleValue: 'Engenheiro Agrônomo',
  },
  {
    id: 'comprador_endereco_completo',
    label: 'Endereço Completo do Comprador / Contratante',
    category: 'Comprador',
    description: 'Logradouro, número, bairro, cidade, UF e CEP concatenados',
    aliases: ['ENDERECO_COMPLETO', 'COMPRADOR_ENDERECO_COMPLETO', 'DOMICILIO_COMPRADOR', 'ENDERECO_CONTRATANTE', 'COMPRADOR_ENDERECO'],
    exampleValue: 'Rua T-55, nº 890, Setor Bueno, Goiânia - GO, CEP: 74230-100',
  },
  {
    id: 'comprador_endereco',
    label: 'Logradouro / Rua do Comprador',
    category: 'Comprador',
    description: 'Rua ou avenida de residência',
    aliases: ['ENDERECO', 'RUA_COMPRADOR', 'LOGRADOURO_COMPRADOR'],
    exampleValue: 'Rua T-55',
  },
  {
    id: 'comprador_numero',
    label: 'Número do Endereço do Comprador',
    category: 'Comprador',
    description: 'Número do imóvel residencial',
    aliases: ['NUMERO', 'NUMERO_ENDERECO', 'COMPRADOR_NUMERO'],
    exampleValue: '890',
  },
  {
    id: 'comprador_bairro',
    label: 'Bairro do Comprador',
    category: 'Comprador',
    description: 'Bairro do comprador',
    aliases: ['BAIRRO', 'BAIRRO_COMPRADOR', 'COMPRADOR_BAIRRO'],
    exampleValue: 'Setor Bueno',
  },
  {
    id: 'comprador_cidade',
    label: 'Cidade do Comprador',
    category: 'Comprador',
    description: 'Município de residência do comprador',
    aliases: ['CIDADE_COMPRADOR', 'COMPRADOR_CIDADE'],
    exampleValue: 'Goiânia',
  },
  {
    id: 'comprador_uf',
    label: 'UF do Comprador',
    category: 'Comprador',
    description: 'Sigla do estado do comprador',
    aliases: ['UF_COMPRADOR', 'ESTADO_COMPRADOR', 'COMPRADOR_UF'],
    exampleValue: 'GO',
  },
  {
    id: 'comprador_cep',
    label: 'CEP do Comprador',
    category: 'Comprador',
    description: 'Código de Endereçamento Postal',
    aliases: ['CEP', 'CEP_COMPRADOR', 'COMPRADOR_CEP'],
    exampleValue: '74230-100',
  },
  {
    id: 'comprador_telefone',
    label: 'Telefone / WhatsApp do Comprador / Contratante',
    category: 'Comprador',
    description: 'Telefone de contato do comprador ou contratante',
    aliases: [
      'TELEFONE', 'TELEFONE_COMPRADOR', 'CONTATO_COMPRADOR', 
      'FONE_COMPRADOR', 'COMPRADOR_TELEFONE', 'WHATSAPP_COMPRADOR', 'TELEFONE_CONTRATANTE'
    ],
    exampleValue: '(62) 99123-4567',
  },
  {
    id: 'comprador_email',
    label: 'E-mail do Comprador',
    category: 'Comprador',
    description: 'Correio eletrônico do comprador',
    aliases: ['EMAIL', 'EMAIL_COMPRADOR', 'COMPRADOR_EMAIL'],
    exampleValue: 'carlos.silva@agronegocios.com.br',
  },

  // CÔNJUGE
  {
    id: 'conjuge_nome',
    label: 'Nome do Cônjuge',
    category: 'Cônjuge',
    description: 'Nome civil do(a) cônjuge se casado(a) ou união estável',
    aliases: ['CONJUGE', 'NOME_CONJUGE', 'CONJUGE_NOME', 'NOME_CONJUGE_COMPRADOR', 'NOME_CONJUGE_CONTRATANTE', 'ESPOSA', 'ESPOSO'],
    exampleValue: 'Mariana Duarte Silva',
  },
  {
    id: 'conjuge_cpf',
    label: 'CPF do Cônjuge',
    category: 'Cônjuge',
    description: 'CPF do(a) cônjuge',
    aliases: ['CPF_CONJUGE', 'CONJUGE_CPF', 'CPF_CONJUGE_COMPRADOR'],
    exampleValue: '987.654.321-99',
  },
  {
    id: 'conjuge_rg',
    label: 'RG do Cônjuge',
    category: 'Cônjuge',
    description: 'RG do(a) cônjuge',
    aliases: ['RG_CONJUGE', 'CONJUGE_RG', 'RG_CONJUGE_COMPRADOR'],
    exampleValue: '5.432.190 SSP/GO',
  },
  {
    id: 'conjuge_profissao',
    label: 'Profissão do Cônjuge',
    category: 'Cônjuge',
    description: 'Profissão do(a) cônjuge',
    aliases: ['PROFISSAO_CONJUGE', 'CONJUGE_PROFISSAO'],
    exampleValue: 'Arquiteta',
  },
  {
    id: 'regime_bens',
    label: 'Regime de Bens',
    category: 'Cônjuge',
    description: 'Regime de bens do casamento',
    aliases: ['REGIME_BENS', 'REGIME_DE_BENS', 'REGIMEBENS'],
    exampleValue: 'Comunhão Parcial de Bens',
  },

  // IMÓVEL / LOTE
  {
    id: 'empreendimento',
    label: 'Nome do Empreendimento',
    category: 'Imóvel/Lote',
    description: 'Nome do loteamento / condomínio',
    aliases: ['EMPREENDIMENTO', 'NOME_EMPREENDIMENTO', 'LOTEAMENTO', 'NOME_LOTEAMENTO', 'CONDOMINIO'],
    exampleValue: 'Reserva Bosque dos Ipês',
  },
  {
    id: 'lote',
    label: 'Número do Lote',
    category: 'Imóvel/Lote',
    description: 'Identificação ou número do lote',
    aliases: ['LOTE', 'NUMERO_LOTE', 'LOTE_NUMERO', 'NUM_LOTE'],
    exampleValue: '02',
  },
  {
    id: 'quadra',
    label: 'Número da Quadra',
    category: 'Imóvel/Lote',
    description: 'Identificação da quadra',
    aliases: ['QUADRA', 'NUMERO_QUADRA', 'QUADRA_NUMERO', 'NUM_QUADRA'],
    exampleValue: '01',
  },
  {
    id: 'tipo_imovel',
    label: 'Tipo do Imóvel',
    category: 'Imóvel/Lote',
    description: 'Tipo e destinação do imóvel (ex: Terreno Urbano / Lote Residencial)',
    aliases: ['TIPO_IMOVEL', 'TIPO_DO_IMOVEL', 'TIPOIMOVEL', 'DESTINACAO_IMOVEL'],
    exampleValue: 'Terreno Urbano / Lote Residencial',
  },
  {
    id: 'localizacao_imovel',
    label: 'Localização do Imóvel',
    category: 'Imóvel/Lote',
    description: 'Localização, endereço ou rua do lote no empreendimento',
    aliases: ['LOCALIZACAO_IMOVEL', 'LOCALIZACAO', 'ENDERECO_IMOVEL', 'LOCALIZACAO_DO_IMOVEL'],
    exampleValue: 'Alameda das Palmeiras, Quadra 01, Lote 02, Goiânia - GO',
  },
  {
    id: 'documento_propriedade',
    label: 'Documento de Propriedade',
    category: 'Imóvel/Lote',
    description: 'Documento comprobatório de propriedade do imóvel',
    aliases: ['DOCUMENTO_PROPRIEDADE', 'DOCUMENTO_DE_PROPRIEDADE', 'DOC_PROPRIEDADE', 'TITULO_PROPRIEDADE'],
    exampleValue: 'Matrícula R-04/182.490 do Cartório de Registro de Imóveis',
  },
  {
    id: 'outros_dados_imovel',
    label: 'Outros Dados do Imóvel',
    category: 'Imóvel/Lote',
    description: 'Informações complementares do imóvel (confrontações, características)',
    aliases: ['OUTROS_DADOS_IMOVEL', 'OUTROS_DADOS', 'DADOS_COMPLEMENTARES_IMOVEL'],
    exampleValue: 'Frente: 12m, Fundo: 30m, confrontando pelo lado direito com Lote 03 e esquerdo com Lote 01',
  },
  {
    id: 'area_m2',
    label: 'Área Total em m²',
    category: 'Imóvel/Lote',
    description: 'Metragem quadrada total do lote',
    aliases: ['AREA', 'AREA_TOTAL', 'AREA_M2', 'METRAGEM', 'METROS_QUADRADOS'],
    exampleValue: '360,00 m²',
  },
  {
    id: 'frente_metros',
    label: 'Metros de Frente',
    category: 'Imóvel/Lote',
    description: 'Dimensão frontal do lote em metros',
    aliases: ['FRENTE', 'METROS_FRENTE', 'MEDIDA_FRENTE', 'FRENTE_METROS'],
    exampleValue: '12,00m',
  },
  {
    id: 'fundo_metros',
    label: 'Metros de Fundo',
    category: 'Imóvel/Lote',
    description: 'Dimensão de fundo do lote em metros',
    aliases: ['FUNDO', 'METROS_FUNDO', 'MEDIDA_FUNDO', 'FUNDO_METROS'],
    exampleValue: '30,00m',
  },
  {
    id: 'empreendimento_cidade',
    label: 'Cidade do Empreendimento',
    category: 'Imóvel/Lote',
    description: 'Município onde o loteamento está localizado',
    aliases: ['CIDADE_EMPREENDIMENTO', 'CIDADE_IMOVEL', 'CIDADE_LOTEAMENTO', 'CIDADE'],
    exampleValue: 'Goiânia',
  },
  {
    id: 'empreendimento_uf',
    label: 'UF do Empreendimento',
    category: 'Imóvel/Lote',
    description: 'Estado onde o loteamento está localizado',
    aliases: ['UF_EMPREENDIMENTO', 'UF_IMOVEL', 'ESTADO_IMOVEL', 'UF'],
    exampleValue: 'GO',
  },
  {
    id: 'matricula',
    label: 'Matrícula do Imóvel',
    category: 'Imóvel/Lote',
    description: 'Número de matrícula ou registro cartorário',
    aliases: ['MATRICULA', 'MATRICULA_IMOVEL', 'REGISTRO_IMOVEL'],
    exampleValue: 'R-04/182.490',
  },
  {
    id: 'cartorio',
    label: 'Cartório de Registro',
    category: 'Imóvel/Lote',
    description: 'Cartório competente',
    aliases: ['CARTORIO', 'CARTORIO_REGISTRO', 'OFICIO_REGISTRO'],
    exampleValue: '1º Ofício de Registro de Imóveis',
  },

  // FINANCEIRO / VALORES / PAGAMENTO
  {
    id: 'valor_venda',
    label: 'Valor da Venda / Preço (R$)',
    category: 'Financeiro',
    description: 'Valor acordado de venda do lote (ex: R$ 180.000,00)',
    aliases: ['VALOR_VENDA', 'VALOR_TOTAL', 'VALOR', 'VALORTOTAL', 'PRECO_VENDA', 'PRECO_TOTAL', 'VALOR_IMOVEL'],
    exampleValue: 'R$ 180.000,00',
  },
  {
    id: 'valor_venda_extenso',
    label: 'Valor da Venda por Extenso',
    category: 'Financeiro',
    description: 'Preço total escrito por extenso',
    aliases: ['VALOR_VENDA_EXTENSO', 'VALOR_TOTAL_EXTENSO', 'VALOREXTENSO', 'VALOR_EXTENSO', 'PRECO_VENDA_EXTENSO', 'PRECO_EXTENSO'],
    exampleValue: 'cento e oitenta mil reais',
  },
  {
    id: 'entrada',
    label: 'Valor da Entrada (R$)',
    category: 'Financeiro',
    description: 'Valor pago como sinal / entrada',
    aliases: ['ENTRADA', 'VALOR_ENTRADA', 'SINAL', 'VALOR_SINAL'],
    exampleValue: 'R$ 36.000,00',
  },
  {
    id: 'entrada_extenso',
    label: 'Valor da Entrada por Extenso',
    category: 'Financeiro',
    description: 'Valor da entrada escrito por extenso',
    aliases: ['ENTRADA_EXTENSO', 'VALOR_ENTRADA_EXTENSO', 'SINAL_EXTENSO'],
    exampleValue: 'trinta e seis mil reais',
  },
  {
    id: 'saldo',
    label: 'Saldo Restante (R$)',
    category: 'Financeiro',
    description: 'Valor total menos a entrada',
    aliases: ['SALDO', 'RESTANTE', 'VALOR_RESTANTE', 'SALDO_DEVEDOR', 'SALDO_RESTANTE', 'SALDO_FINANCIAR'],
    exampleValue: 'R$ 144.000,00',
  },
  {
    id: 'saldo_extenso',
    label: 'Saldo Restante por Extenso',
    category: 'Financeiro',
    description: 'Saldo restante escrito por extenso',
    aliases: ['SALDO_EXTENSO', 'RESTANTE_EXTENSO', 'VALOR_RESTANTE_EXTENSO', 'SALDO_DEVEDOR_EXTENSO'],
    exampleValue: 'cento e quarenta e quatro mil reais',
  },
  {
    id: 'quantidade_parcelas',
    label: 'Quantidade de Parcelas',
    category: 'Financeiro',
    description: 'Número de parcelas mensais contratadas',
    aliases: ['QUANTIDADE_PARCELAS', 'QUANTIDADEPARCELAS', 'QTD_PARCELAS', 'NUMERO_PARCELAS', 'NUM_PARCELAS', 'TOTAL_PARCELAS'],
    exampleValue: '60',
  },
  {
    id: 'valor_parcela',
    label: 'Valor da Parcela (R$)',
    category: 'Financeiro',
    description: 'Valor mensal de cada parcela',
    aliases: ['VALOR_PARCELA', 'PARCELAS', 'VALOR_DAS_PARCELAS', 'PRESTACAO', 'VALOR_PRESTACAO'],
    exampleValue: 'R$ 2.400,00',
  },
  {
    id: 'valor_parcela_extenso',
    label: 'Valor da Parcela por Extenso',
    category: 'Financeiro',
    description: 'Valor da parcela escrito por extenso',
    aliases: ['VALOR_PARCELA_EXTENSO', 'PARCELAS_EXTENSO', 'VALOR_DAS_PARCELAS_EXTENSO'],
    exampleValue: 'dois mil e quatrocentos reais',
  },
  {
    id: 'data_primeira_parcela',
    label: 'Data da Primeira Parcela (DD/MM/AAAA)',
    category: 'Financeiro',
    description: 'Data de vencimento da 1ª parcela',
    aliases: ['DATA_PRIMEIRA_PARCELA', 'DATAPRIMEIRAPARCELA', 'PRIMEIRA_PARCELA', 'INICIO_PAGAMENTO'],
    exampleValue: '10/09/2026',
  },
  {
    id: 'dia_vencimento',
    label: 'Dia do Vencimento',
    category: 'Financeiro',
    description: 'Dia do mês para pagamento das parcelas (ex: dia 10)',
    aliases: ['DIA_VENCIMENTO', 'DATAVENCIMENTO', 'DATA_VENCIMENTO', 'VENCIMENTO'],
    exampleValue: 'dia 10 de cada mês',
  },
  {
    id: 'forma_pagamento',
    label: 'Forma de Pagamento',
    category: 'Financeiro',
    description: 'Modalidade de pagamento (ex: À Vista via Pix/TED ou Financiamento em 60x)',
    aliases: ['FORMA_PAGAMENTO', 'MODOPAG', 'MODO_PAGAMENTO', 'CONDICAO_PAGAMENTO', 'TIPO_PAGAMENTO'],
    exampleValue: 'À VISTA via Transferência Instantânea (Pix)',
  },
  {
    id: 'condicoes_pagamento',
    label: 'Condições de Pagamento',
    category: 'Financeiro',
    description: 'Condições comerciais negociadas para venda',
    aliases: ['CONDICOES_PAGAMENTO', 'CONDICOES_DE_PAGAMENTO', 'DETALHES_PAGAMENTO'],
    exampleValue: 'À Vista no ato da assinatura ou Financiamento Bancário em até 120 dias',
  },
  {
    id: 'percentual_corretagem',
    label: 'Percentual de Corretagem (%)',
    category: 'Financeiro',
    description: 'Percentual de comissão imobiliária (ex: 7%)',
    aliases: ['PERCENTUAL_CORRETAGEM', 'PERCENTUAL_COMISSAO', 'PORCENTAGEM_CORRETAGEM', 'COMISSAO_PERCENTUAL'],
    exampleValue: '7%',
  },
  {
    id: 'percentual_corretagem_extenso',
    label: 'Percentual de Corretagem por Extenso',
    category: 'Financeiro',
    description: 'Percentual de comissão escrito por extenso (ex: sete por cento)',
    aliases: ['PERCENTUAL_CORRETAGEM_EXTENSO', 'COMISSAO_EXTENSO'],
    exampleValue: 'sete por cento',
  },
  {
    id: 'prazo_exclusividade_dias',
    label: 'Prazo de Exclusividade (Dias)',
    category: 'Financeiro',
    description: 'Número de dias pactuado para corretagem exclusiva',
    aliases: ['PRAZO_EXCLUSIVIDADE_DIAS', 'PRAZO_EXCLUSIVIDADE', 'DIAS_EXCLUSIVIDADE'],
    exampleValue: '90 dias',
  },
  {
    id: 'data_termino_exclusividade',
    label: 'Data de Término da Exclusividade',
    category: 'Financeiro',
    description: 'Data final do período de exclusividade',
    aliases: ['DATA_TERMINO_EXCLUSIVIDADE', 'TERMINO_EXCLUSIVIDADE', 'FIM_EXCLUSIVIDADE'],
    exampleValue: '21/11/2026',
  },

  // LOCAL E ASSINATURAS
  {
    id: 'cidade_assinatura',
    label: 'Cidade da Assinatura',
    category: 'Datas e Geral',
    description: 'Cidade configurada onde o contrato é assinado',
    aliases: ['CIDADE_ASSINATURA', 'CIDADE_LOCAL'],
    exampleValue: 'Santarém',
  },
  {
    id: 'estado_assinatura',
    label: 'Estado da Assinatura',
    category: 'Datas e Geral',
    description: 'Sigla do estado configurado onde o contrato é assinado',
    aliases: ['ESTADO_ASSINATURA', 'UF_ASSINATURA'],
    exampleValue: 'PA',
  },
  {
    id: 'dia_assinatura',
    label: 'Dia da Assinatura',
    category: 'Datas e Geral',
    description: 'Dia do mês da assinatura (ex: 21)',
    aliases: ['DIA_ASSINATURA', 'DIA_CONTRATO', 'DIA'],
    exampleValue: '21',
  },
  {
    id: 'mes_assinatura_extenso',
    label: 'Mês da Assinatura por Extenso',
    category: 'Datas e Geral',
    description: 'Nome do mês em português (ex: agosto)',
    aliases: ['MES_ASSINATURA_EXTENSO', 'MES_EXTENSO', 'MES_CONTRATO', 'MES'],
    exampleValue: 'agosto',
  },
  {
    id: 'ano_assinatura',
    label: 'Ano da Assinatura',
    category: 'Datas e Geral',
    description: 'Ano com quatro dígitos (ex: 2026)',
    aliases: ['ANO_ASSINATURA', 'ANO_CONTRATO', 'ANO'],
    exampleValue: '2026',
  },
  {
    id: 'data_contrato',
    label: 'Data do Contrato (DD/MM/AAAA)',
    category: 'Datas e Geral',
    description: 'Data completa formatada em DD/MM/AAAA',
    aliases: ['DATA_CONTRATO', 'DATA', 'DATACONTRATO', 'DATA_EMISSAO', 'DATA_ASSINATURA', 'DATA_ATUAL'],
    exampleValue: '21/08/2026',
  },
  {
    id: 'data_contrato_extenso',
    label: 'Data por Extenso (ex: 21 de agosto de 2026)',
    category: 'Datas e Geral',
    description: 'Data completa formatada por extenso',
    aliases: ['DATA_EXTENSO', 'DATA_CONTRATO_EXTENSO', 'DATA_COMPLETA_EXTENSO'],
    exampleValue: '21 de agosto de 2026',
  },
  {
    id: 'codigo_venda',
    label: 'Código da Venda',
    category: 'Datas e Geral',
    description: 'Protocolo de registro da venda',
    aliases: ['CODIGO_VENDA', 'PROTOCOLO', 'NUMERO_CONTRATO'],
    exampleValue: 'VND-2026-8942',
  },

  // ASSINATURAS E TESTEMUNHAS
  {
    id: 'assinatura_comprador',
    label: 'Linha de Assinatura do Comprador',
    category: 'Assinaturas',
    description: 'Bloco ou linha com nome e CPF do comprador para assinatura',
    aliases: ['ASSINATURA_COMPRADOR', 'ASSINATURA_CLIENTE', 'ASS_COMPRADOR'],
    exampleValue: '___________________________________\nCarlos Alberto Silva\nCPF: 123.456.789-00',
  },
  {
    id: 'assinatura_conjuge',
    label: 'Linha de Assinatura do Cônjuge',
    category: 'Assinaturas',
    description: 'Bloco ou linha para assinatura do(a) cônjuge',
    aliases: ['ASSINATURA_CONJUGE', 'ASS_CONJUGE'],
    exampleValue: '___________________________________\nMariana Duarte Silva\nCPF: 987.654.321-99',
  },
  {
    id: 'assinatura_vendedor',
    label: 'Linha de Assinatura do Vendedor / Corretor',
    category: 'Assinaturas',
    description: 'Bloco para assinatura do vendedor ou corretor',
    aliases: ['ASSINATURA_VENDEDOR', 'ASSINATURA_CORRETOR', 'ASS_VENDEDOR'],
    exampleValue: '___________________________________\nRoberto Silva Albuquerque\nCRECI-PA 4810-J',
  },
  {
    id: 'testemunha1_nome',
    label: 'Nome da Testemunha 1',
    category: 'Assinaturas',
    description: 'Nome da primeira testemunha do contrato',
    aliases: ['TESTEMUNHA1_NOME', 'TESTEMUNHA_1_NOME', 'NOME_TESTEMUNHA1'],
    exampleValue: 'Lucas de Souza Ferreira',
  },
  {
    id: 'testemunha1_cpf',
    label: 'CPF da Testemunha 1',
    category: 'Assinaturas',
    description: 'CPF da primeira testemunha',
    aliases: ['TESTEMUNHA1_CPF', 'TESTEMUNHA_1_CPF', 'CPF_TESTEMUNHA1'],
    exampleValue: '345.678.901-22',
  },
  {
    id: 'testemunha2_nome',
    label: 'Nome da Testemunha 2',
    category: 'Assinaturas',
    description: 'Nome da segunda testemunha do contrato',
    aliases: ['TESTEMUNHA2_NOME', 'TESTEMUNHA_2_NOME', 'NOME_TESTEMUNHA2'],
    exampleValue: 'Patricia Martins Rocha',
  },
  {
    id: 'testemunha2_cpf',
    label: 'CPF da Testemunha 2',
    category: 'Assinaturas',
    description: 'CPF da segunda testemunha',
    aliases: ['TESTEMUNHA2_CPF', 'TESTEMUNHA_2_CPF', 'CPF_TESTEMUNHA2'],
    exampleValue: '678.901.234-55',
  },
];

/**
 * Normaliza um texto de tag para facilitar comparação
 * Remove [ ] { } espaços e converte para maiúsculo
 */
export function normalizeTag(tag: string): string {
  return tag
    .replace(/[\[\]\{\}]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

/**
 * Encontra no catálogo qual campo do sistema corresponde à tag fornecida
 */
export function findSystemFieldByTag(rawTag: string): SystemFieldDefinition | null {
  const norm = normalizeTag(rawTag);
  if (!norm) return null;

  for (const field of SYSTEM_FIELDS_CATALOG) {
    // Verifica aliases
    for (const alias of field.aliases) {
      if (normalizeTag(alias) === norm) {
        return field;
      }
    }
    // Verifica id normalizado
    if (normalizeTag(field.id) === norm) {
      return field;
    }
  }

  return null;
}

/**
 * Extrai todas as tags [CAMPO] e {campo} de uma string (texto ou XML)
 */
export function extractTagsFromText(text: string): DocumentFieldMapping[] {
  if (!text) return [];

  const regex = /\[([A-Za-z0-9_À-ÿ\s-]+)\]|\{([A-Za-z0-9_À-ÿ\s-]+)\}/g;
  const foundMap = new Map<string, DocumentFieldMapping>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawTag = match[0];
    const cleanTag = (match[1] || match[2] || '').trim();

    if (!rawTag || !cleanTag) continue;
    if (cleanTag.length > 60) continue;

    if (!foundMap.has(rawTag)) {
      const recognized = findSystemFieldByTag(rawTag);
      if (recognized) {
        foundMap.set(rawTag, {
          rawTag,
          cleanTag,
          systemFieldId: recognized.id,
          systemFieldLabel: recognized.label,
          status: 'reconhecido',
        });
      } else {
        foundMap.set(rawTag, {
          rawTag,
          cleanTag,
          systemFieldId: '',
          systemFieldLabel: 'Não mapeado',
          status: 'nao_reconhecido',
        });
      }
    }
  }

  return Array.from(foundMap.values());
}

/**
 * Obtém o valor preenchido de um campo do sistema a partir de um registro de venda
 */
export function getSystemFieldValue(
  fieldId: string,
  sale: SaleRecord,
  customValues?: Record<string, string>
): string {
  if (customValues && customValues[fieldId]) {
    return customValues[fieldId];
  }

  const isParcelado = sale.financial.tipoPagamento === 'parcelado';
  const saldoRestante = Math.max(0, sale.financial.valorTotal - (sale.financial.entrada || 0));
  const contractDate = sale.createdAt ? sale.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];

  let companyConfig;
  try {
    companyConfig = getStoredCompanyConfig();
  } catch (e) {
    companyConfig = {
      nomeEmpresa: 'ImobGestão Empreendimentos Imobiliários Ltda',
      cpfCnpj: '28.910.450/0001-90',
      telefone: '(93) 3522-8800',
      email: 'contato@imobgestao.com.br',
      endereco: 'Av. Mendonça Furtado, nº 1.450',
      cidade: 'Santarém',
      estado: 'PA',
      creci: 'CRECI-PA 4810-J',
      cidadeAssinatura: 'Santarém',
      estadoAssinatura: 'PA',
    };
  }

  switch (fieldId) {
    // VENDEDOR / CORRETOR / CONTRATADO
    case 'vendedor_nome':
    case 'vendedor':
      return sale.seller.vendedorNome || companyConfig.nomeEmpresa || 'IMOBGESTÃO EMPREENDIMENTOS';
    case 'vendedor_cpf_cnpj':
    case 'cpf_vendedor':
      return sale.seller.vendedorCpfCnpj || companyConfig.cpfCnpj || '28.910.450/0001-90';
    case 'vendedor_creci':
    case 'rg_vendedor':
      return sale.seller.vendedorCreci || companyConfig.creci || '0000000';
    case 'emissao_rg_vendedor':
      return 'SSP/PA';
    case 'nacionalidade_vendedor':
      return 'brasileira';
    case 'estado_civil_vendedor':
      return 'casado(a)';
    case 'portador_vendedor':
    case 'port':
      return 'portador(a)';
    case 'artigo_vendedor':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'tratamento_vendedor':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'Sra.' : 'Sr.';
    case 'concordancia_vendedor':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'vendedor_termo':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'PROMITENTE VENDEDORA' : 'PROMITENTE VENDEDOR';
    case 'vendedor_endereco':
    case 'endereco_vendedor':
      return sale.seller.vendedorEndereco || companyConfig.endereco || 'Av. Mendonça Furtado';
    case 'numero_vendedor':
      return '1450';
    case 'bairro_vendedor':
      return 'Centro';
    case 'cidade_vendedor':
      return companyConfig.cidade || sale.property.cidade || 'Santarém';
    case 'estado_vendedor':
      return companyConfig.estado || sale.property.uf || 'PA';
    case 'cep_vendedor':
      return '68005-100';
    case 'vendedor_telefone':
    case 'telefone_vendedor':
      return sale.seller.vendedorTelefone || companyConfig.telefone || '(93) 3522-8800';
    case 'vendedor_email':
      return sale.seller.vendedorEmail || companyConfig.email || '';

    // COMPRADOR / CONTRATANTE
    case 'comprador_nome':
    case 'comprador':
      return sale.buyer.nome || 'COMPRADOR';
    case 'comprador_cpf':
    case 'cpf_comprador':
    case 'cpf1':
      return sale.buyer.cpf || '000.000.000-00';
    case 'comprador_rg':
    case 'rg_comprador':
      return sale.buyer.rg || '0000000';
    case 'emissao_rg_comprador':
      return 'SSP/PA';
    case 'comprador_estadocivil':
    case 'estado_civil_comprador':
      return sale.buyer.estadoCivil || 'solteiro(a)';
    case 'comprador_nacionalidade':
    case 'nacionalidade_comprador':
      return sale.buyer.nacionalidade || 'brasileiro(a)';
    case 'portador_comprador':
      return 'portador(a)';
    case 'artigo_comprador': {
      const isF = sale.buyer.nome.trim().endsWith('a') || (sale.buyer.estadoCivil?.includes('a') ?? false);
      return isF ? 'a' : 'o';
    }
    case 'tratamento_comprador': {
      const isF = sale.buyer.nome.trim().endsWith('a') || (sale.buyer.estadoCivil?.includes('a') ?? false);
      return isF ? 'Sra.' : 'Sr.';
    }
    case 'concordancia_comprador': {
      const isF = sale.buyer.nome.trim().endsWith('a') || (sale.buyer.estadoCivil?.includes('a') ?? false);
      return isF ? 'a' : 'o';
    }
    case 'comprador_termo': {
      const isF = sale.buyer.nome.trim().endsWith('a') || (sale.buyer.estadoCivil?.includes('a') ?? false);
      return isF ? 'PROMITENTE COMPRADORA' : 'PROMITENTE COMPRADOR';
    }
    case 'preposicao_comprador': {
      const isF = sale.buyer.nome.trim().endsWith('a') || (sale.buyer.estadoCivil?.includes('a') ?? false);
      return isF ? 'à' : 'ao';
    }
    case 'comprador_profissao':
    case 'profissao_comprador':
      return sale.buyer.profissao || '';
    case 'comprador_endereco_completo': {
      const b = sale.buyer;
      const parts = [
        b.endereco,
        b.numero ? `nº ${b.numero}` : '',
        b.complemento,
        b.bairro ? `Bairro ${b.bairro}` : '',
        b.cidade ? `${b.cidade} - ${b.uf}` : '',
        b.cep ? `CEP: ${b.cep}` : '',
      ].filter(Boolean);
      return parts.join(', ');
    }
    case 'comprador_endereco':
    case 'endereco_comprador':
      return sale.buyer.endereco || 'Rua Principal';
    case 'comprador_numero':
    case 'numero_comprador':
      return sale.buyer.numero || 'S/N';
    case 'comprador_bairro':
    case 'bairro_comprador':
      return sale.buyer.bairro || 'Centro';
    case 'comprador_cidade':
    case 'cidade_comprador':
      return sale.buyer.cidade || sale.property.cidade || 'Santarém';
    case 'comprador_uf':
    case 'estado_comprador':
      return sale.buyer.uf || sale.property.uf || 'PA';
    case 'comprador_cep':
    case 'cep_comprador':
      return sale.buyer.cep || '68000-000';
    case 'comprador_telefone':
    case 'telefone_comprador':
      return sale.buyer.contato1 || sale.buyer.contato2 || '(93) 99999-9999';
    case 'comprador_email':
      return sale.buyer.email || '';

    // GÊNEROS CONTRATUAIS
    case 'generov':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'generov2':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'generov3':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'A' : 'O';
    case 'generov4':
      return (sale.seller.vendedorNome || '').trim().endsWith('a') ? 'à' : 'ao';
    case 'generoc':
      return (sale.buyer.nome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'generoc2':
      return (sale.buyer.nome || '').trim().endsWith('a') ? 'a' : 'o';
    case 'generoc3':
      return (sale.buyer.nome || '').trim().endsWith('a') ? 'A' : 'O';

    // CÔNJUGE
    case 'conjuge_nome':
      return sale.buyer.nomeConjuge || '';
    case 'conjuge_cpf':
      return sale.buyer.cpfConjuge || '';
    case 'conjuge_rg':
      return sale.buyer.rgConjuge || '';
    case 'conjuge_profissao':
      return sale.buyer.profissaoConjuge || '';
    case 'regime_bens':
      return sale.buyer.regimeBens || 'Comunhão Parcial de Bens';

    // IMÓVEL / LOTE
    case 'empreendimento':
      return sale.property.empreendimento || '';
    case 'lote':
      return sale.property.lote || '';
    case 'quadra':
      return sale.property.quadra || '';
    case 'tipo_imovel':
      return sale.property.tipoImovel || 'Terreno Urbano / Lote Residencial';
    case 'localizacao_imovel':
      return sale.property.localizacaoImovel || `${sale.property.empreendimento}, Quadra ${sale.property.quadra}, Lote ${sale.property.lote}, ${sale.property.cidade} - ${sale.property.uf}`;
    case 'documento_propriedade':
      return sale.property.documentoPropriedade || `Matrícula ${sale.property.matricula || 'R-04/182.490'} do ${sale.property.registroCartorio || 'Cartório de Registro de Imóveis'}`;
    case 'outros_dados_imovel':
      return sale.property.outrosDadosImovel || `Área Total: ${sale.property.areaM2 || 360} m² (Frente: ${sale.property.frenteMetros || 12}m x Fundo: ${sale.property.fundoMetros || 30}m)`;
    case 'area_m2':
      return sale.property.areaM2 ? `${sale.property.areaM2.toLocaleString('pt-BR')} m²` : '360,00 m²';
    case 'frente_metros':
      return sale.property.frenteMetros ? `${sale.property.frenteMetros.toLocaleString('pt-BR')}m` : '12,00m';
    case 'fundo_metros':
      return sale.property.fundoMetros ? `${sale.property.fundoMetros.toLocaleString('pt-BR')}m` : '30,00m';
    case 'empreendimento_cidade':
      return sale.property.cidade || companyConfig.cidade || '';
    case 'empreendimento_uf':
      return sale.property.uf || companyConfig.estado || '';
    case 'matricula':
      return sale.property.matricula || 'R-04/182.490';
    case 'cartorio':
      return sale.property.registroCartorio || '1º Ofício de Registro de Imóveis';

    // FINANCEIRO
    case 'valor_venda':
    case 'valor_total':
      return formatCurrency(sale.financial.valorTotal);
    case 'valor_venda_extenso':
    case 'valor_total_extenso':
      return valorPorExtenso(sale.financial.valorTotal);
    case 'entrada':
      return formatCurrency(sale.financial.entrada);
    case 'entrada_extenso':
      return valorPorExtenso(sale.financial.entrada);
    case 'saldo':
    case 'restante':
      return formatCurrency(saldoRestante);
    case 'saldo_extenso':
    case 'restante_extenso':
      return valorPorExtenso(saldoRestante);
    case 'quantidade_parcelas':
    case 'quantidadeparcelas':
      return isParcelado ? String(sale.financial.quantidadeParcelas || 1) : '1';
    case 'valor_parcela':
    case 'parcelas': {
      if (!isParcelado) return formatCurrency(sale.financial.valorTotal);
      const math = calcularParcelamentoAjustado(sale.financial.valorTotal, sale.financial.quantidadeParcelas || 1, sale.financial.entrada);
      return formatCurrency(math.valorParcelaPadrao);
    }
    case 'valor_parcela_extenso':
    case 'parcelas_extenso': {
      if (!isParcelado) return valorPorExtenso(sale.financial.valorTotal);
      const math = calcularParcelamentoAjustado(sale.financial.valorTotal, sale.financial.quantidadeParcelas || 1, sale.financial.entrada);
      return valorPorExtenso(math.valorParcelaPadrao);
    }
    case 'data_primeira_parcela':
    case 'dataprimeiraparcela':
      return formatDateBR(sale.financial.dataPrimeiraParcela || sale.financial.dataVencimento) || formatDateBR(contractDate);
    case 'dia_vencimento':
    case 'datavencimento': {
      if (sale.financial.diaVencimento) {
        return `dia ${sale.financial.diaVencimento} de cada mês`;
      }
      if (sale.financial.dataVencimento) {
        const parts = sale.financial.dataVencimento.split('-');
        const day = parts.length === 3 ? parts[2] : '10';
        return `dia ${day} de cada mês`;
      }
      return 'dia 10 de cada mês';
    }
    case 'forma_pagamento':
    case 'modopag':
      return isParcelado
        ? `Parcelado com entrada de ${formatCurrency(sale.financial.entrada)} e saldo em ${sale.financial.quantidadeParcelas}x de ${formatCurrency(sale.financial.valorParcela)}`
        : `À VISTA via ${sale.financial.formaPagamentoEntrada || 'Transferência Instantânea (Pix)'}`;
    case 'condicoes_pagamento':
      return sale.financial.condicoesPagamento || (isParcelado ? 'Parcelamento Direto com a Loteadora' : 'Pagamento Integral À Vista na Assinatura');
    case 'percentual_corretagem':
      return sale.financial.percentualCorretagem ? `${sale.financial.percentualCorretagem}%` : '6%';
    case 'percentual_corretagem_extenso':
      return percentualPorExtenso(sale.financial.percentualCorretagem || 6);
    case 'prazo_exclusividade_dias':
      return sale.financial.prazoExclusividadeDias ? `${sale.financial.prazoExclusividadeDias} dias` : '90 dias';
    case 'data_termino_exclusividade':
      return formatDateBR(sale.financial.dataTerminoExclusividade) || formatDateBR(contractDate);

    // DATAS E LOCAL
    case 'cidade_assinatura':
      return companyConfig.cidadeAssinatura || companyConfig.cidade || sale.property.cidade || 'Santarém';
    case 'estado_assinatura':
      return companyConfig.estadoAssinatura || companyConfig.estado || sale.property.uf || 'PA';
    case 'dia_assinatura':
      return getDiaAssinatura(contractDate);
    case 'mes_assinatura_extenso':
      return getMesAssinaturaExtenso(contractDate);
    case 'ano_assinatura':
      return getAnoAssinatura(contractDate);
    case 'data_contrato':
      return formatDateBR(contractDate);
    case 'data_contrato_extenso':
      return formatDateExtenso(contractDate);
    case 'codigo_venda':
      return sale.codigoVenda;

    // ASSINATURAS
    case 'assinatura_comprador':
      return `___________________________________\n${sale.buyer.nome}\nCPF: ${sale.buyer.cpf}`;
    case 'assinatura_conjuge':
      return sale.buyer.nomeConjuge ? `___________________________________\n${sale.buyer.nomeConjuge}\nCPF: ${sale.buyer.cpfConjuge}` : '';
    case 'assinatura_vendedor':
      return `___________________________________\n${sale.seller.vendedorNome || companyConfig.nomeEmpresa}\n${sale.seller.vendedorCreci || companyConfig.creci}`;
    case 'testemunha1_nome':
      return 'Lucas de Souza Ferreira';
    case 'testemunha1_cpf':
      return '345.678.901-22';
    case 'testemunha2_nome':
      return 'Patricia Martins Rocha';
    case 'testemunha2_cpf':
      return '678.901.234-55';

    default:
      return '';
  }
}

/**
 * Lê um arquivo .docx enviado pelo usuário e retorna texto, html e tags identificadas
 */
export async function parseUploadedDocxFile(file: File): Promise<{
  fileName: string;
  fileBase64: string;
  rawText: string;
  contentHtml: string;
  tags: DocumentFieldMapping[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  // 1. Converte ArrayBuffer para Base64
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const fileBase64 = btoa(binary);

  // 2. Extrai texto e HTML via Mammoth
  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });

  let rawText = rawTextResult.value || '';
  let contentHtml = mammothResult.value || '';

  // 3. Lê também diretamente via JSZip para inspecionar word/document.xml caso mammoth omita tags em tabelas/headers
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const docXmlText = await docXmlFile.async('text');
      const xmlTags = extractTagsFromText(docXmlText);
      const textTags = extractTagsFromText(rawText);

      const combined = new Map<string, DocumentFieldMapping>();
      for (const t of [...textTags, ...xmlTags]) {
        combined.set(t.rawTag, t);
      }

      return {
        fileName: file.name,
        fileBase64,
        rawText,
        contentHtml,
        tags: Array.from(combined.values()),
      };
    }
  } catch (err) {
    console.warn('Não foi possível ler word/document.xml via JSZip diretamente:', err);
  }

  const tags = extractTagsFromText(rawText);

  return {
    fileName: file.name,
    fileBase64,
    rawText,
    contentHtml,
    tags,
  };
}

/**
 * Preenche o arquivo .docx mantendo o arquivo Word original intacto e criando uma nova cópia
 */
export async function generateFilledDocx(
  template: DocumentTemplate,
  sale: SaleRecord,
  customValues?: Record<string, string>
): Promise<{ docxBlob: Blob; fileName: string; filledHtml: string }> {
  const replacementMap = new Map<string, string>();

  for (const tag of template.tags) {
    let value = '';
    const fieldId = template.customMappings?.[tag.rawTag] || tag.systemFieldId;

    if (fieldId) {
      value = getSystemFieldValue(fieldId, sale, customValues);
    } else if (tag.customDefaultValue) {
      value = tag.customDefaultValue;
    } else {
      const recognized = findSystemFieldByTag(tag.rawTag);
      if (recognized) {
        value = getSystemFieldValue(recognized.id, sale, customValues);
      }
    }

    replacementMap.set(tag.rawTag, value);
  }

  // Mapeamento dinâmico para tags padrão do catálogo em maiúsculo e minúsculo
  for (const field of SYSTEM_FIELDS_CATALOG) {
    const val = getSystemFieldValue(field.id, sale, customValues);
    replacementMap.set(`[${field.id.toUpperCase()}]`, val);
    replacementMap.set(`{${field.id.toLowerCase()}}`, val);
    for (const alias of field.aliases) {
      replacementMap.set(`[${alias.toUpperCase()}]`, val);
      replacementMap.set(`{${alias.toLowerCase()}}`, val);
    }
  }

  let filledHtml = template.contentHtml || `<pre>${template.rawText}</pre>`;
  replacementMap.forEach((val, key) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filledHtml = filledHtml.replace(new RegExp(escaped, 'g'), val);
  });

  let docxBlob: Blob;
  if (template.fileBase64) {
    try {
      const binaryString = atob(template.fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const zip = await JSZip.loadAsync(bytes);
      const xmlFileNames = Object.keys(zip.files).filter(
        name => name.startsWith('word/') && (name.endsWith('.xml') || name.endsWith('.xml.rels'))
      );

      for (const xmlName of xmlFileNames) {
        const file = zip.file(xmlName);
        if (file) {
          let xmlContent = await file.async('text');
          
          replacementMap.forEach((val, key) => {
            const safeXmlVal = (val || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            xmlContent = xmlContent.replace(new RegExp(escaped, 'g'), safeXmlVal);
          });

          zip.file(xmlName, xmlContent);
        }
      }

      docxBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    } catch (err) {
      console.error('Erro ao manipular zip do docx:', err);
      docxBlob = new Blob([filledHtml], { type: 'application/msword' });
    }
  } else {
    docxBlob = new Blob([filledHtml], { type: 'application/msword' });
  }

  const cleanClientName = (sale.buyer.nome || 'CLIENTE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_');
  
  const baseName = template.fileName
    ? template.fileName.replace(/\.docx$/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '_')
    : template.nome.toUpperCase().replace(/[^A-Z0-9]/g, '_');

  const generatedFileName = `${baseName}_${cleanClientName}.docx`;

  return {
    docxBlob,
    fileName: generatedFileName,
    filledHtml,
  };
}

/**
 * 3 Modelos Oficiais de Fábrica:
 * 1. Recibo de Quitação (À Vista)
 * 2. Compromisso de Compra e Venda (Parcelada)
 * 3. Contrato de Exclusividade (Venda de Casas)
 */
export const DEFAULT_WORD_TEMPLATES: DocumentTemplate[] = [
  // MODELO 1: RECIBO DE QUITAÇÃO (À VISTA)
  {
    id: 'tpl_recibo_quitacao',
    nome: 'Recibo de Quitação (À Vista)',
    tipoDocumento: 'recibo_quitacao',
    descricao: 'Documento oficial de quitação integral e definitiva para vendas com pagamento à vista.',
    fileName: 'RECIBO_DE_QUITACAO_A_VISTA.docx',
    rawText: `RECIBO DE QUITAÇÃO INTEGRAL E DEFINITIVA

Pelo presente instrumento particular, o(a) VENDEDOR(A) / CREDOR(A):
Nome/Razão Social: {nome_contratado}
CPF/CNPJ: {cpf_cnpj_contratado} | CRECI: {creci_contratado}
Endereço: {endereco_contratado} | Telefone: {telefones_contratado}

DECLARA para todos os fins de direito e efeitos jurídicos que RECEBEU do(a) PROMITENTE COMPRADOR(A):
Nome: {nome_comprador}
Nacionalidade: Brasileira | Estado Civil: {estado_civil_comprador} | Profissão: {profissao_comprador}
RG: {rg_comprador} | CPF/MF: {cpf_comprador}
Endereço: {endereco_comprador} | Telefone/WhatsApp: {comprador_telefone}
(Se aplicável) Cônjuge: {nome_conjuge_comprador}, RG {rg_conjuge_comprador}, CPF {cpf_conjuge_comprador}

A quantia líquida, certa e ajustada de R$ {valor_venda} ({valor_venda_extenso}), paga integralmente à vista através de {forma_pagamento}, referente à QUITAÇÃO INTEGRAL, TOTAL E IRREVOGÁVEL do imóvel:
Lote: {lote} | Quadra: {quadra}
Empreendimento: {empreendimento}
Localização: {localizacao_imovel}
Área: {area_m2} | Matrícula Geral: {matricula}

Por ser a expressão da verdade e tendo recebido o valor integral, a Vendedora confere ao Comprador plena, geral, rasa e definitiva quitação de preço, nada mais tendo a reclamar a qualquer título, outorgando-lhe a posse direta e definitiva do imóvel.

{cidade_assinatura}({estado_assinatura}), {dia_assinatura} de {mes_assinatura_extenso} de {ano_assinatura}.

__________________________________________________
{assinatura_vendedor}
VENDEDORA / CORRETOR RESPONSÁVEL - CRECI: {creci_contratado}

__________________________________________________
{assinatura_comprador}
COMPRADOR(A) - CPF: {cpf_comprador}

__________________________________________________
{assinatura_conjuge}
CÔNJUGE`,
    contentHtml: `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px;">
    <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">RECIBO DE QUITAÇÃO INTEGRAL E DEFINITIVA (À VISTA)</h2>
    <p style="margin: 6px 0 0 0; font-size: 9.5pt; color: #555;">Protocolo da Venda: <strong>{codigo_venda}</strong></p>
  </div>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    Pelo presente instrumento particular, o(a) <strong>VENDEDOR(A) / CREDOR(A)</strong>: <strong>{nome_contratado}</strong>, inscrito(a) no CPF/CNPJ sob o nº <strong>{cpf_cnpj_contratado}</strong>, CRECI nº <strong>{creci_contratado}</strong>, estabelecido(a) em {endereco_contratado}, telefone {telefones_contratado};
  </p>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    <strong>DECLARA</strong> para os devidos fins de direito que <strong>RECEBEU</strong> na presente data do(a) <strong>PROMITENTE COMPRADOR(A)</strong>: <strong>{nome_comprador}</strong>, nacionalidade brasileira, estado civil {estado_civil_comprador}, profissão {profissao_comprador}, portador(a) do RG nº {rg_comprador}, inscrito(a) no CPF/MF sob o nº <strong>{cpf_comprador}</strong>, residente e domiciliado(a) em <strong>{endereco_comprador}</strong>, contato {comprador_telefone};
  </p>

  <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0;">
    <p style="margin: 4px 0;">• <strong>Valor Total Quitado:</strong> R$ {valor_venda} ({valor_venda_extenso})</p>
    <p style="margin: 4px 0;">• <strong>Forma de Pagamento:</strong> {forma_pagamento} à vista</p>
    <p style="margin: 4px 0;">• <strong>Imóvel Quitado:</strong> Lote nº <strong>{lote}</strong>, Quadra nº <strong>{quadra}</strong>, Loteamento <strong>{empreendimento}</strong>, {localizacao_imovel}</p>
    <p style="margin: 4px 0;">• <strong>Área Total:</strong> {area_m2} | <strong>Matrícula:</strong> {matricula}</p>
  </div>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.5em;">
    Tendo recebido o montante integral avençado, a Vendedora confere ao Comprador <strong>PLENA, RASA, GERAL E DEFINITIVA QUITAÇÃO DE PREÇO</strong>, nada mais havendo a reclamar sobre a presente transação imobiliária, transmitindo-lhe desde já a posse definitiva do imóvel.
  </p>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 45px;">
    <strong>{cidade_assinatura}({estado_assinatura})</strong>, <strong>{dia_assinatura}</strong> de <strong>{mes_assinatura_extenso}</strong> de <strong>{ano_assinatura}</strong>.
  </p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{vendedor_nome}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Vendedora / Corretor Responsável (CRECI: {creci_contratado})</p>
    </div>
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{nome_comprador}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Comprador(a) - CPF: {cpf_comprador}</p>
    </div>
  </div>
</div>`,
    tags: [
      { rawTag: '{nome_comprador}', cleanTag: 'nome_comprador', systemFieldId: 'comprador_nome', systemFieldLabel: 'Nome do Comprador', status: 'reconhecido' },
      { rawTag: '{cpf_comprador}', cleanTag: 'cpf_comprador', systemFieldId: 'comprador_cpf', systemFieldLabel: 'CPF do Comprador', status: 'reconhecido' },
      { rawTag: '{rg_comprador}', cleanTag: 'rg_comprador', systemFieldId: 'comprador_rg', systemFieldLabel: 'RG do Comprador', status: 'reconhecido' },
      { rawTag: '{estado_civil_comprador}', cleanTag: 'estado_civil_comprador', systemFieldId: 'comprador_estadocivil', systemFieldLabel: 'Estado Civil do Comprador', status: 'reconhecido' },
      { rawTag: '{profissao_comprador}', cleanTag: 'profissao_comprador', systemFieldId: 'comprador_profissao', systemFieldLabel: 'Profissão do Comprador', status: 'reconhecido' },
      { rawTag: '{endereco_comprador}', cleanTag: 'endereco_comprador', systemFieldId: 'comprador_endereco_completo', systemFieldLabel: 'Endereço do Comprador', status: 'reconhecido' },
      { rawTag: '{comprador_telefone}', cleanTag: 'comprador_telefone', systemFieldId: 'comprador_telefone', systemFieldLabel: 'Telefone do Comprador', status: 'reconhecido' },
      { rawTag: '{nome_conjuge_comprador}', cleanTag: 'nome_conjuge_comprador', systemFieldId: 'conjuge_nome', systemFieldLabel: 'Nome do Cônjuge', status: 'reconhecido' },
      { rawTag: '{cpf_conjuge_comprador}', cleanTag: 'cpf_conjuge_comprador', systemFieldId: 'conjuge_cpf', systemFieldLabel: 'CPF do Cônjuge', status: 'reconhecido' },
      { rawTag: '{rg_conjuge_comprador}', cleanTag: 'rg_conjuge_comprador', systemFieldId: 'conjuge_rg', systemFieldLabel: 'RG do Cônjuge', status: 'reconhecido' },
      { rawTag: '{empreendimento}', cleanTag: 'empreendimento', systemFieldId: 'empreendimento', systemFieldLabel: 'Nome do Empreendimento', status: 'reconhecido' },
      { rawTag: '{quadra}', cleanTag: 'quadra', systemFieldId: 'quadra', systemFieldLabel: 'Número da Quadra', status: 'reconhecido' },
      { rawTag: '{lote}', cleanTag: 'lote', systemFieldId: 'lote', systemFieldLabel: 'Número do Lote', status: 'reconhecido' },
      { rawTag: '{tipo_imovel}', cleanTag: 'tipo_imovel', systemFieldId: 'tipo_imovel', systemFieldLabel: 'Tipo do Imóvel', status: 'reconhecido' },
      { rawTag: '{localizacao_imovel}', cleanTag: 'localizacao_imovel', systemFieldId: 'localizacao_imovel', systemFieldLabel: 'Localização do Imóvel', status: 'reconhecido' },
      { rawTag: '{valor_venda}', cleanTag: 'valor_venda', systemFieldId: 'valor_venda', systemFieldLabel: 'Valor Quitado (R$)', status: 'reconhecido' },
      { rawTag: '{valor_venda_extenso}', cleanTag: 'valor_venda_extenso', systemFieldId: 'valor_venda_extenso', systemFieldLabel: 'Valor por Extenso', status: 'reconhecido' },
      { rawTag: '{forma_pagamento}', cleanTag: 'forma_pagamento', systemFieldId: 'forma_pagamento', systemFieldLabel: 'Forma de Pagamento', status: 'reconhecido' },
      { rawTag: '{matricula}', cleanTag: 'matricula', systemFieldId: 'matricula', systemFieldLabel: 'Matrícula do Imóvel', status: 'reconhecido' },
      { rawTag: '{cidade_assinatura}', cleanTag: 'cidade_assinatura', systemFieldId: 'cidade_assinatura', systemFieldLabel: 'Cidade da Assinatura', status: 'reconhecido' },
      { rawTag: '{estado_assinatura}', cleanTag: 'estado_assinatura', systemFieldId: 'estado_assinatura', systemFieldLabel: 'Estado da Assinatura', status: 'reconhecido' },
      { rawTag: '{dia_assinatura}', cleanTag: 'dia_assinatura', systemFieldId: 'dia_assinatura', systemFieldLabel: 'Dia da Assinatura', status: 'reconhecido' },
      { rawTag: '{mes_assinatura_extenso}', cleanTag: 'mes_assinatura_extenso', systemFieldId: 'mes_assinatura_extenso', systemFieldLabel: 'Mês por Extenso', status: 'reconhecido' },
      { rawTag: '{ano_assinatura}', cleanTag: 'ano_assinatura', systemFieldId: 'ano_assinatura', systemFieldLabel: 'Ano da Assinatura', status: 'reconhecido' },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // MODELO 2: COMPROMISSO DE COMPRA E VENDA (PARCELADA)
  {
    id: 'tpl_compromisso_parcelado',
    nome: 'Compromisso de Compra e Venda (Parcelada)',
    tipoDocumento: 'compromisso_parcelado',
    descricao: 'Instrumento particular de compromisso de compra e venda de imóvel com plano detalhado de parcelamento.',
    fileName: 'COMPROMISSO_COMPRA_E_VENDA_PARCELADA.docx',
    rawText: `INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL PARCELADO

Pelo presente instrumento particular de compromisso de compra e venda, de um lado como PROMITENTE VENDEDORA:
{nome_contratado}, inscrita no CNPJ/MF sob o nº {cpf_cnpj_contratado}, CRECI nº {creci_contratado}, estabelecida em {endereco_contratado};

E de outro lado como PROMITENTE COMPRADOR(A):
Nome: {nome_comprador}, brasileiro(a), {estado_civil_comprador}, {profissao_comprador}, portador(a) do RG nº {rg_comprador}, inscrito(a) no CPF/MF sob o nº {cpf_comprador}, residente e domiciliado(a) em {endereco_comprador}, telefone {comprador_telefone};
Cônjuge: {nome_conjuge_comprador}, RG nº {rg_conjuge_comprador}, CPF nº {cpf_conjuge_comprador}.

CLÁUSULA PRIMEIRA - DO IMÓVEL:
Constitui objeto deste compromisso o lote de terreno denominado LOTE Nº {lote}, da QUADRA Nº {quadra}, do loteamento {empreendimento}, localizado em {localizacao_imovel}, com área de {area_m2} e matrícula {matricula}.

CLÁUSULA SEGUNDA - DO PREÇO E PLANO DE PARCELAMENTO:
O preço certo e total pactuado para a presente aquisição é de R$ {valor_total} ({valor_total_extenso}), que será satisfeito nas seguintes condições:
a) ENTRADA: O valor de R$ {entrada} ({entrada_extenso}), adimplido na assinatura deste instrumento;
b) SALDO DEVEDOR: O saldo de R$ {saldo} ({saldo_extenso}), dividido em {quantidade_parcelas} parcelas mensais e consecutivas no valor de R$ {valor_parcela} ({valor_parcela_extenso}) cada;
c) VENCIMENTOS: O primeiro vencimento em {data_primeira_parcela}, e as parcelas subsequentes no dia {dia_vencimento} de cada mês;
d) FORMA DE PAGAMENTO: {forma_pagamento}.

CLÁUSULA TERCEIRA - DA POSSE E OBRIGAÇÕES:
O(A) Promitente Comprador(a) é imitido(a) na posse provisória do imóvel, passando a responder por todos os impostos (IPTU/ITU), taxas e encargos incidentes.

{cidade_assinatura}({estado_assinatura}), {dia_assinatura} de {mes_assinatura_extenso} de {ano_assinatura}.

__________________________________________________
{assinatura_vendedor}
PROMITENTE VENDEDORA / CRECI: {creci_contratado}

__________________________________________________
{assinatura_comprador}
PROMITENTE COMPRADOR(A) - CPF: {cpf_comprador}

__________________________________________________
{assinatura_conjuge}
CÔNJUGE`,
    contentHtml: `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px;">
    <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA (PARCELADO)</h2>
    <p style="margin: 6px 0 0 0; font-size: 9.5pt; color: #555;">Protocolo da Venda: <strong>{codigo_venda}</strong></p>
  </div>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    Pelo presente instrumento particular, de um lado como <strong>PROMITENTE VENDEDORA</strong>: <strong>{nome_contratado}</strong>, inscrita no CNPJ nº <strong>{cpf_cnpj_contratado}</strong>, CRECI nº <strong>{creci_contratado}</strong>, sediada em {endereco_contratado};
  </p>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    E de outro lado como <strong>PROMITENTE COMPRADOR(A)</strong>: <strong>{nome_comprador}</strong>, brasileiro(a), {estado_civil_comprador}, {profissao_comprador}, portador(a) do RG nº {rg_comprador}, inscrito(a) no CPF nº <strong>{cpf_comprador}</strong>, residente e domiciliado(a) em <strong>{endereco_comprador}</strong>, telefone {comprador_telefone}.
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA PRIMEIRA — DO IMÓVEL</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1em;">
    Constitui objeto deste compromisso a promessa de compra e venda do <strong>LOTE Nº {lote}</strong>, da <strong>QUADRA Nº {quadra}</strong>, do loteamento <strong>{empreendimento}</strong>, localizado em {localizacao_imovel}, com área de {area_m2}, registrado sob matrícula {matricula}.
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA SEGUNDA — DO PREÇO E PLANO DE PAGAMENTO</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1em;">
    O preço total do imóvel é de <strong>R$ {valor_total}</strong> (<strong>{valor_total_extenso}</strong>), pactuado nas seguintes condições:
  </p>

  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 18px; margin: 15px 0;">
    <p style="margin: 4px 0;">• <strong>Entrada:</strong> R$ {entrada} ({entrada_extenso}), paga no ato.</p>
    <p style="margin: 4px 0;">• <strong>Saldo Restante:</strong> R$ {saldo} ({saldo_extenso}), dividido em <strong>{quantidade_parcelas} parcelas mensais</strong> de <strong>R$ {valor_parcela}</strong> ({valor_parcela_extenso}) cada.</p>
    <p style="margin: 4px 0;">• <strong>Vencimentos:</strong> 1ª parcela em <strong>{data_primeira_parcela}</strong> e as demais no dia <strong>{dia_vencimento}</strong> de cada mês.</p>
    <p style="margin: 4px 0;">• <strong>Forma de Pagamento:</strong> {forma_pagamento}.</p>
  </div>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 45px;">
    <strong>{cidade_assinatura}({estado_assinatura})</strong>, <strong>{dia_assinatura}</strong> de <strong>{mes_assinatura_extenso}</strong> de <strong>{ano_assinatura}</strong>.
  </p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{vendedor_nome}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Vendedora / Corretor Responsável</p>
    </div>
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{nome_comprador}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Promitente Comprador(a)</p>
    </div>
  </div>
</div>`,
    tags: [
      { rawTag: '{nome_comprador}', cleanTag: 'nome_comprador', systemFieldId: 'comprador_nome', systemFieldLabel: 'Nome do Comprador', status: 'reconhecido' },
      { rawTag: '{cpf_comprador}', cleanTag: 'cpf_comprador', systemFieldId: 'comprador_cpf', systemFieldLabel: 'CPF do Comprador', status: 'reconhecido' },
      { rawTag: '{rg_comprador}', cleanTag: 'rg_comprador', systemFieldId: 'comprador_rg', systemFieldLabel: 'RG do Comprador', status: 'reconhecido' },
      { rawTag: '{estado_civil_comprador}', cleanTag: 'estado_civil_comprador', systemFieldId: 'comprador_estadocivil', systemFieldLabel: 'Estado Civil do Comprador', status: 'reconhecido' },
      { rawTag: '{profissao_comprador}', cleanTag: 'profissao_comprador', systemFieldId: 'comprador_profissao', systemFieldLabel: 'Profissão do Comprador', status: 'reconhecido' },
      { rawTag: '{endereco_comprador}', cleanTag: 'endereco_comprador', systemFieldId: 'comprador_endereco_completo', systemFieldLabel: 'Endereço do Comprador', status: 'reconhecido' },
      { rawTag: '{comprador_telefone}', cleanTag: 'comprador_telefone', systemFieldId: 'comprador_telefone', systemFieldLabel: 'Telefone do Comprador', status: 'reconhecido' },
      { rawTag: '{empreendimento}', cleanTag: 'empreendimento', systemFieldId: 'empreendimento', systemFieldLabel: 'Nome do Empreendimento', status: 'reconhecido' },
      { rawTag: '{quadra}', cleanTag: 'quadra', systemFieldId: 'quadra', systemFieldLabel: 'Número da Quadra', status: 'reconhecido' },
      { rawTag: '{lote}', cleanTag: 'lote', systemFieldId: 'lote', systemFieldLabel: 'Número do Lote', status: 'reconhecido' },
      { rawTag: '{tipo_imovel}', cleanTag: 'tipo_imovel', systemFieldId: 'tipo_imovel', systemFieldLabel: 'Tipo do Imóvel', status: 'reconhecido' },
      { rawTag: '{localizacao_imovel}', cleanTag: 'localizacao_imovel', systemFieldId: 'localizacao_imovel', systemFieldLabel: 'Localização do Imóvel', status: 'reconhecido' },
      { rawTag: '{valor_total}', cleanTag: 'valor_total', systemFieldId: 'valor_total', systemFieldLabel: 'Valor Total (R$)', status: 'reconhecido' },
      { rawTag: '{valor_total_extenso}', cleanTag: 'valor_total_extenso', systemFieldId: 'valor_total_extenso', systemFieldLabel: 'Valor Total por Extenso', status: 'reconhecido' },
      { rawTag: '{entrada}', cleanTag: 'entrada', systemFieldId: 'entrada', systemFieldLabel: 'Valor da Entrada (R$)', status: 'reconhecido' },
      { rawTag: '{entrada_extenso}', cleanTag: 'entrada_extenso', systemFieldId: 'entrada_extenso', systemFieldLabel: 'Valor da Entrada por Extenso', status: 'reconhecido' },
      { rawTag: '{saldo}', cleanTag: 'saldo', systemFieldId: 'saldo', systemFieldLabel: 'Saldo Restante (R$)', status: 'reconhecido' },
      { rawTag: '{saldo_extenso}', cleanTag: 'saldo_extenso', systemFieldId: 'saldo_extenso', systemFieldLabel: 'Saldo Restante por Extenso', status: 'reconhecido' },
      { rawTag: '{quantidade_parcelas}', cleanTag: 'quantidade_parcelas', systemFieldId: 'quantidade_parcelas', systemFieldLabel: 'Quantidade de Parcelas', status: 'reconhecido' },
      { rawTag: '{valor_parcela}', cleanTag: 'valor_parcela', systemFieldId: 'valor_parcela', systemFieldLabel: 'Valor da Parcela (R$)', status: 'reconhecido' },
      { rawTag: '{valor_parcela_extenso}', cleanTag: 'valor_parcela_extenso', systemFieldId: 'valor_parcela_extenso', systemFieldLabel: 'Valor da Parcela por Extenso', status: 'reconhecido' },
      { rawTag: '{data_primeira_parcela}', cleanTag: 'data_primeira_parcela', systemFieldId: 'data_primeira_parcela', systemFieldLabel: 'Data da 1ª Parcela', status: 'reconhecido' },
      { rawTag: '{dia_vencimento}', cleanTag: 'dia_vencimento', systemFieldId: 'dia_vencimento', systemFieldLabel: 'Dia do Vencimento', status: 'reconhecido' },
      { rawTag: '{forma_pagamento}', cleanTag: 'forma_pagamento', systemFieldId: 'forma_pagamento', systemFieldLabel: 'Forma de Pagamento', status: 'reconhecido' },
      { rawTag: '{cidade_assinatura}', cleanTag: 'cidade_assinatura', systemFieldId: 'cidade_assinatura', systemFieldLabel: 'Cidade da Assinatura', status: 'reconhecido' },
      { rawTag: '{estado_assinatura}', cleanTag: 'estado_assinatura', systemFieldId: 'estado_assinatura', systemFieldLabel: 'Estado da Assinatura', status: 'reconhecido' },
      { rawTag: '{dia_assinatura}', cleanTag: 'dia_assinatura', systemFieldId: 'dia_assinatura', systemFieldLabel: 'Dia da Assinatura', status: 'reconhecido' },
      { rawTag: '{mes_assinatura_extenso}', cleanTag: 'mes_assinatura_extenso', systemFieldId: 'mes_assinatura_extenso', systemFieldLabel: 'Mês por Extenso', status: 'reconhecido' },
      { rawTag: '{ano_assinatura}', cleanTag: 'ano_assinatura', systemFieldId: 'ano_assinatura', systemFieldLabel: 'Ano da Assinatura', status: 'reconhecido' },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // MODELO 3: CONTRATO DE EXCLUSIVIDADE (VENDA DE CASAS)
  {
    id: 'tpl_exclusividade_casas',
    nome: 'Contrato de Exclusividade (Venda de Casas)',
    tipoDocumento: 'exclusividade_casas',
    descricao: 'Contrato de prestação de serviços de corretagem imobiliária com cláusula de exclusividade para venda de casas e imóveis.',
    fileName: 'CONTRATO_EXCLUSIVIDADE_VENDA_CASAS.docx',
    rawText: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CORRETAGEM COM EXCLUSIVIDADE (VENDA DE CASAS)

Pelo presente instrumento particular:

CONTRATANTE / PROPRIETÁRIO(A):
Nome: {nome_contratante}, {estado_civil_contratante}, {profissao_contratante}
RG nº {rg_contratante} | CPF nº {cpf_contratante}
Endereço: {endereco_contratante} | Telefone: {telefone_contratante}
(Se aplicável) Cônjuge: {nome_conjuge_contratante}, CPF {cpf_conjuge}, RG {rg_conjuge}

CONTRATADO(A) / CORRETOR(A):
Nome: {nome_contratado}
CPF/CNPJ: {cpf_cnpj_contratado} | CRECI nº {creci_contratado}
Endereço: {endereco_contratado} | Telefone: {telefones_contratado}

CLÁUSULA PRIMEIRA - DO IMÓVEL:
O Contratante autoriza com exclusividade a intermediação para a venda da casa/imóvel {tipo_imovel}, situado em {localizacao_imovel}, com características: {outros_dados_imovel}, documento de comprovação {documento_propriedade}.

CLÁUSULA SEGUNDA - DO PREÇO DE VENDA:
O imóvel será anunciado e comercializado pelo valor de R$ {preco_venda} ({preco_venda_extenso}), nas seguintes condições: {condicoes_pagamento}.

CLÁUSULA TERCEIRA - DOS HONORÁRIOS DE CORRETAGEM:
Pela intermediação exitosa, o Contratante pagará ao Contratado o percentual de {percentual_corretagem} ({percentual_corretagem_extenso}) sobre o valor final de venda do imóvel.

CLÁUSULA QUARTA - DO PRAZO DE EXCLUSIVIDADE:
A presente autorização é outorgada em caráter de exclusividade pelo prazo de {prazo_exclusividade_dias}, com término previsto para {data_termino_exclusividade}.

{cidade_assinatura}({estado_assinatura}), {dia_assinatura} de {mes_assinatura_extenso} de {ano_assinatura}.

__________________________________________________
{assinatura_vendedor}
CONTRATADO (CORRETOR RESPONSÁVEL - CRECI: {creci_contratado})

__________________________________________________
{assinatura_comprador}
CONTRATANTE (PROPRIETÁRIO DO IMÓVEL)`,
    contentHtml: `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px;">
    <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">CONTRATO DE EXCLUSIVIDADE PARA VENDA DE CASAS / IMÓVEIS</h2>
    <p style="margin: 6px 0 0 0; font-size: 9.5pt; color: #555;">Código do Contrato: <strong>{codigo_venda}</strong></p>
  </div>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    <strong>CONTRATANTE:</strong> <strong>{nome_contratante}</strong>, {estado_civil_contratante}, {profissao_contratante}, RG nº {rg_contratante}, CPF nº <strong>{cpf_contratante}</strong>, domiciliado(a) em {endereco_contratante}, telefone {telefone_contratante};
  </p>

  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.2em;">
    <strong>CONTRATADO(A):</strong> <strong>{nome_contratado}</strong>, CPF/CNPJ nº <strong>{cpf_cnpj_contratado}</strong>, CRECI nº <strong>{creci_contratado}</strong>, estabelecido(a) em {endereco_contratado}, telefone {telefones_contratado}.
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA 1ª — DO IMÓVEL RESIDENCIAL</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1em;">
    O Contratante confere exclusividade para a venda do imóvel/casa caracterizado como <strong>{tipo_imovel}</strong>, situado em <strong>{localizacao_imovel}</strong>, respaldado pelo título <strong>{documento_propriedade}</strong> ({outros_dados_imovel}).
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA 2ª — DO PREÇO DA OFERTA</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1em;">
    O imóvel será ofertado pelo valor de <strong>R$ {preco_venda}</strong> (<strong>{preco_venda_extenso}</strong>), aceitando as seguintes condições: {condicoes_pagamento}.
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA 3ª — DA COMISSÃO DE CORRETAGEM</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1em;">
    Pela intermediação imobiliária, o Contratante pagará a comissão no percentual de <strong>{percentual_corretagem}</strong> (<strong>{percentual_corretagem_extenso}</strong>) sobre o valor da venda.
  </p>

  <h4 style="margin: 1.5em 0 0.5em 0; text-transform: uppercase; font-size: 11.5pt;">CLÁUSULA 4ª — DO PRAZO DE EXCLUSIVIDADE</h4>
  <p style="text-align: justify; text-indent: 1.5cm; margin-bottom: 1.5em;">
    A exclusividade de venda vigerá pelo prazo de <strong>{prazo_exclusividade_dias}</strong>, com término em <strong>{data_termino_exclusividade}</strong>.
  </p>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 45px;">
    <strong>{cidade_assinatura}({estado_assinatura})</strong>, <strong>{dia_assinatura}</strong> de <strong>{mes_assinatura_extenso}</strong> de <strong>{ano_assinatura}</strong>.
  </p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{vendedor_nome}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Contratado / Corretor Responsável (CRECI: {creci_contratado})</p>
    </div>
    <div style="text-align: center; border-top: 1px solid #333; padding-top: 8px;">
      <p style="margin: 0; font-weight: bold;">{nome_comprador}</p>
      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">Contratante / Proprietário</p>
    </div>
  </div>
</div>`,
    tags: [
      { rawTag: '{nome_contratante}', cleanTag: 'nome_contratante', systemFieldId: 'comprador_nome', systemFieldLabel: 'Nome do Contratante', status: 'reconhecido' },
      { rawTag: '{estado_civil_contratante}', cleanTag: 'estado_civil_contratante', systemFieldId: 'comprador_estadocivil', systemFieldLabel: 'Estado Civil do Contratante', status: 'reconhecido' },
      { rawTag: '{profissao_contratante}', cleanTag: 'profissao_contratante', systemFieldId: 'comprador_profissao', systemFieldLabel: 'Profissão do Contratante', status: 'reconhecido' },
      { rawTag: '{cpf_contratante}', cleanTag: 'cpf_contratante', systemFieldId: 'comprador_cpf', systemFieldLabel: 'CPF do Contratante', status: 'reconhecido' },
      { rawTag: '{rg_contratante}', cleanTag: 'rg_contratante', systemFieldId: 'comprador_rg', systemFieldLabel: 'RG do Contratante', status: 'reconhecido' },
      { rawTag: '{endereco_contratante}', cleanTag: 'endereco_contratante', systemFieldId: 'comprador_endereco_completo', systemFieldLabel: 'Endereço do Contratante', status: 'reconhecido' },
      { rawTag: '{telefone_contratante}', cleanTag: 'telefone_contratante', systemFieldId: 'comprador_telefone', systemFieldLabel: 'Telefone do Contratante', status: 'reconhecido' },
      { rawTag: '{nome_contratado}', cleanTag: 'nome_contratado', systemFieldId: 'vendedor_nome', systemFieldLabel: 'Nome do Contratado', status: 'reconhecido' },
      { rawTag: '{cpf_cnpj_contratado}', cleanTag: 'cpf_cnpj_contratado', systemFieldId: 'vendedor_cpf_cnpj', systemFieldLabel: 'CPF/CNPJ do Contratado', status: 'reconhecido' },
      { rawTag: '{creci_contratado}', cleanTag: 'creci_contratado', systemFieldId: 'vendedor_creci', systemFieldLabel: 'CRECI do Contratado', status: 'reconhecido' },
      { rawTag: '{endereco_contratado}', cleanTag: 'endereco_contratado', systemFieldId: 'vendedor_endereco', systemFieldLabel: 'Endereço do Contratado', status: 'reconhecido' },
      { rawTag: '{telefones_contratado}', cleanTag: 'telefones_contratado', systemFieldId: 'vendedor_telefone', systemFieldLabel: 'Telefone do Contratado', status: 'reconhecido' },
      { rawTag: '{tipo_imovel}', cleanTag: 'tipo_imovel', systemFieldId: 'tipo_imovel', systemFieldLabel: 'Tipo do Imóvel', status: 'reconhecido' },
      { rawTag: '{localizacao_imovel}', cleanTag: 'localizacao_imovel', systemFieldId: 'localizacao_imovel', systemFieldLabel: 'Localização do Imóvel', status: 'reconhecido' },
      { rawTag: '{documento_propriedade}', cleanTag: 'documento_propriedade', systemFieldId: 'documento_propriedade', systemFieldLabel: 'Documento de Propriedade', status: 'reconhecido' },
      { rawTag: '{outros_dados_imovel}', cleanTag: 'outros_dados_imovel', systemFieldId: 'outros_dados_imovel', systemFieldLabel: 'Outros Dados do Imóvel', status: 'reconhecido' },
      { rawTag: '{preco_venda}', cleanTag: 'preco_venda', systemFieldId: 'valor_venda', systemFieldLabel: 'Preço de Venda (R$)', status: 'reconhecido' },
      { rawTag: '{preco_venda_extenso}', cleanTag: 'preco_venda_extenso', systemFieldId: 'valor_venda_extenso', systemFieldLabel: 'Preço por Extenso', status: 'reconhecido' },
      { rawTag: '{condicoes_pagamento}', cleanTag: 'condicoes_pagamento', systemFieldId: 'condicoes_pagamento', systemFieldLabel: 'Condições de Pagamento', status: 'reconhecido' },
      { rawTag: '{percentual_corretagem}', cleanTag: 'percentual_corretagem', systemFieldId: 'percentual_corretagem', systemFieldLabel: 'Percentual de Corretagem (%)', status: 'reconhecido' },
      { rawTag: '{percentual_corretagem_extenso}', cleanTag: 'percentual_corretagem_extenso', systemFieldId: 'percentual_corretagem_extenso', systemFieldLabel: 'Percentual por Extenso', status: 'reconhecido' },
      { rawTag: '{prazo_exclusividade_dias}', cleanTag: 'prazo_exclusividade_dias', systemFieldId: 'prazo_exclusividade_dias', systemFieldLabel: 'Prazo de Exclusividade', status: 'reconhecido' },
      { rawTag: '{data_termino_exclusividade}', cleanTag: 'data_termino_exclusividade', systemFieldId: 'data_termino_exclusividade', systemFieldLabel: 'Término da Exclusividade', status: 'reconhecido' },
      { rawTag: '{cidade_assinatura}', cleanTag: 'cidade_assinatura', systemFieldId: 'cidade_assinatura', systemFieldLabel: 'Cidade da Assinatura', status: 'reconhecido' },
      { rawTag: '{estado_assinatura}', cleanTag: 'estado_assinatura', systemFieldId: 'estado_assinatura', systemFieldLabel: 'Estado da Assinatura', status: 'reconhecido' },
      { rawTag: '{dia_assinatura}', cleanTag: 'dia_assinatura', systemFieldId: 'dia_assinatura', systemFieldLabel: 'Dia da Assinatura', status: 'reconhecido' },
      { rawTag: '{mes_assinatura_extenso}', cleanTag: 'mes_assinatura_extenso', systemFieldId: 'mes_assinatura_extenso', systemFieldLabel: 'Mês por Extenso', status: 'reconhecido' },
      { rawTag: '{ano_assinatura}', cleanTag: 'ano_assinatura', systemFieldId: 'ano_assinatura', systemFieldLabel: 'Ano da Assinatura', status: 'reconhecido' },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
