import JSZip from 'jszip';
import { ContratoModularFormData } from '../types/modularContract';
import { formatCurrency, valorPorExtenso, formatDateBR, formatDateExtenso } from './formatters';

/**
 * Calcula a data de término somando dias corridos à data de início
 * @param dataInicio Formato YYYY-MM-DD
 * @param dias Quantidade de dias
 * @returns Formato YYYY-MM-DD
 */
export function calcularDataTermino(dataInicio: string, dias: number): string {
  if (!dataInicio || isNaN(dias) || dias <= 0) return '';
  try {
    const parts = dataInicio.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    date.setDate(date.getDate() + Number(dias));
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    return '';
  }
}

/**
 * Calcula o valor da comissão com base no preço e percentual
 */
export function calcularComissao(preco: number, percentual: number): number {
  if (!preco || !percentual || isNaN(preco) || isNaN(percentual)) return 0;
  return Math.round((Number(preco) * Number(percentual)) / 100 * 100) / 100;
}

/**
 * Monta o dicionário de tags e flags de blocos condicionais
 */
export function buildModularReplacementData(data: ContratoModularFormData) {
  const b = data.blocks;
  const precoVenda = b.precoCondicoes ? data.precoCondicoes.precoVenda : (b.exclusividade ? data.exclusividade.precoAutorizadoVenda : 0);
  const comissaoPercent = b.comissao ? data.comissao.percentual : (b.exclusividade ? data.exclusividade.percentualComissao : 6);
  const comissaoValor = b.comissao ? data.comissao.valorComissao : (b.exclusividade ? data.exclusividade.valorComissao : calcularComissao(precoVenda, comissaoPercent));

  const tags: Record<string, string> = {
    // CONTRATANTE
    NOME_CONTRATANTE: data.contratante.nome || '',
    NOME: data.contratante.nome || '',
    ESTADO_CIVIL_CONTRATANTE: data.contratante.estadoCivil || '',
    ESTADOCIVIL: data.contratante.estadoCivil || '',
    PROFISSAO_CONTRATANTE: data.contratante.profissao || '',
    PROFISSAO: data.contratante.profissao || '',
    CPF_CONTRATANTE: data.contratante.cpf || '',
    CPF: data.contratante.cpf || '',
    RG_CONTRATANTE: data.contratante.rg || '',
    RG: data.contratante.rg || '',
    ENDERECO_CONTRATANTE: data.contratante.endereco || '',
    ENDERECO: data.contratante.endereco || '',
    TELEFONE_CONTRATANTE: data.contratante.telefone || '',
    TELEFONE: data.contratante.telefone || '',
    EMAIL_CONTRATANTE: data.contratante.email || '',
    EMAIL: data.contratante.email || '',
    NACIONALIDADE_CONTRATANTE: data.contratante.nacionalidade || 'Brasileira',

    // CÔNJUGE
    NOME_CONJUGE: data.conjuge.nome || '',
    CPF_CONJUGE: data.conjuge.cpf || '',
    RG_CONJUGE: data.conjuge.rg || '',
    PROFISSAO_CONJUGE: data.conjuge.profissao || '',
    REGIME_BENS: data.conjuge.regimeBens || 'Comunhão Parcial de Bens',

    // CORRETOR / CONTRATADO
    NOME_CONTRATADO: data.corretor.nome || '',
    NOME_CORRETOR: data.corretor.nome || '',
    CORRETOR: data.corretor.nome || '',
    CPF_CNPJ_CONTRATADO: data.corretor.cpfCnpj || '',
    CPF_CNPJ_CORRETOR: data.corretor.cpfCnpj || '',
    CRECI_CONTRATADO: data.corretor.creci || '',
    CRECI_CORRETOR: data.corretor.creci || '',
    CRECI: data.corretor.creci || '',
    ENDERECO_CONTRATADO: data.corretor.endereco || '',
    TELEFONE_CONTRATADO: data.corretor.telefone || '',
    EMAIL_CONTRATADO: data.corretor.email || '',

    // IMÓVEL
    IMOVEL_TIPO: data.imovel.tipoImovel || '',
    TIPO_IMOVEL: data.imovel.tipoImovel || '',
    IMOVEL_LOCALIZACAO: data.imovel.localizacao || '',
    LOCALIZACAO: data.imovel.localizacao || '',
    IMOVEL_ENDERECO: data.imovel.endereco || '',
    IMOVEL_NUMERO: data.imovel.numero || '',
    IMOVEL_COMPLEMENTO: data.imovel.complemento || '',
    IMOVEL_BAIRRO: data.imovel.bairro || '',
    IMOVEL_CIDADE: data.imovel.cidade || '',
    IMOVEL_UF: data.imovel.uf || '',
    IMOVEL_CEP: data.imovel.cep || '',
    IMOVEL_AREA_M2: data.imovel.areaM2 || '',
    AREA_TOTAL: data.imovel.areaM2 || '',
    LOTE: data.imovel.lote || '',
    QUADRA: data.imovel.quadra || '',
    EMPREENDIMENTO: data.imovel.empreendimento || '',

    // DOCUMENTAÇÃO IMÓVEL
    DOCUMENTO_PROPRIEDADE: data.documentacaoImovel.documentoPropriedade || '',
    IMOVEL_MATRICULA: data.documentacaoImovel.matricula || '',
    MATRICULA: data.documentacaoImovel.matricula || '',
    INSCRICAO_MUNICIPAL: data.documentacaoImovel.inscricaoMunicipal || '',
    CARTORIO: data.documentacaoImovel.cartorio || '',
    OUTROS_DADOS_IMOVEL: data.documentacaoImovel.outrosDados || '',

    // PREÇO E CONDIÇÕES
    PRECO_VENDA: formatCurrency(precoVenda),
    VALOR_TOTAL: formatCurrency(precoVenda),
    VALOR: formatCurrency(precoVenda),
    PRECO_VENDA_EXTENSO: valorPorExtenso(precoVenda),
    VALOR_EXTENSO: valorPorExtenso(precoVenda),
    CONDICOES_PAGAMENTO: data.precoCondicoes.condicoesPagamento || '',
    OBSERVACOES_COMERCIAIS: data.precoCondicoes.observacoesComerciais || '',

    // EXCLUSIVIDADE
    DATA_INICIO_EXCLUSIVIDADE: formatDateBR(data.exclusividade.dataInicio),
    PRAZO_EXCLUSIVIDADE_DIAS: `${data.exclusividade.prazoDias || 0} dias`,
    DATA_TERMINO_EXCLUSIVIDADE: formatDateBR(data.exclusividade.dataTermino),
    TIPO_CONTRATACAO: data.exclusividade.tipoContratacao || 'Intermediação com Exclusividade',
    PRECO_AUTORIZADO_VENDA: formatCurrency(data.exclusividade.precoAutorizadoVenda),
    PERCENTUAL_COMISSAO_EXCLUSIVIDADE: `${data.exclusividade.percentualComissao || 0}%`,
    VALOR_COMISSAO_EXCLUSIVIDADE: formatCurrency(data.exclusividade.valorComissao),
    CONDICOES_PAGAMENTO_AUTORIZADAS: data.exclusividade.condicoesPagamentoAutorizadas || '',
    OBSERVACOES_EXCLUSIVIDADE: data.exclusividade.observacoesExclusividade || '',

    // COMISSÃO INDEPENDENTE
    COMISSAO_PERCENTUAL: `${comissaoPercent}%`,
    PERCENTUAL_COMISSAO: `${comissaoPercent}%`,
    COMISSAO_VALOR: formatCurrency(comissaoValor),
    VALOR_COMISSAO: formatCurrency(comissaoValor),
    COMISSAO_VALOR_EXTENSO: valorPorExtenso(comissaoValor),
    FORMA_PAGAMENTO_COMISSAO: data.comissao.formaPagamentoComissao || 'No ato da assinatura ou recebimento do sinal da venda',

    // PRAZO DO CONTRATO
    DATA_INICIO: formatDateBR(data.prazo.dataInicio),
    QUANTIDADE_DIAS: `${data.prazo.quantidadeDias || 0} dias`,
    PRAZO_DIAS: `${data.prazo.quantidadeDias || 0} dias`,
    DATA_TERMINO: formatDateBR(data.prazo.dataTermino),

    // PROTEÇÃO DOS INTERESSADOS
    PRAZO_PROTECAO_DIAS: `${data.protecaoInteressados.prazoProtecaoDias || 0} dias`,
    OBSERVACOES_PROTECAO: data.protecaoInteressados.observacoes || '',

    // FORO
    FORO_COMARCA: data.foro.comarca || 'Santarém',
    FORO_UF: data.foro.uf || 'PA',
    COMARCA: data.foro.comarca || 'Santarém',
    CIDADE_FORO: `${data.foro.comarca || 'Santarém'} - ${data.foro.uf || 'PA'}`,

    // DATAS GERAIS
    DATA_EMISSAO: formatDateBR(data.dataEmissao || new Date().toISOString().split('T')[0]),
    DATA_CONTRATO: formatDateBR(data.dataEmissao || new Date().toISOString().split('T')[0]),
    DATA_CONTRATO_EXTENSO: formatDateExtenso(data.dataEmissao || new Date().toISOString().split('T')[0]),

    // TESTEMUNHAS
    TESTEMUNHA1_NOME: data.assinaturas.testemunha1.nome || '',
    TESTEMUNHA1_CPF: data.assinaturas.testemunha1.cpf || '',
    TESTEMUNHA2_NOME: data.assinaturas.testemunha2.nome || '',
    TESTEMUNHA2_CPF: data.assinaturas.testemunha2.cpf || '',
  };

  // Flags booleanas para blocos condicionais {{#BLOCO}} ... {{/BLOCO}}
  const blocksFlags: Record<string, boolean> = {
    CONTRATANTE: b.contratante,
    DADOS_CONTRATANTE: b.contratante,
    CONJUGE: b.conjuge,
    DADOS_CONJUGE: b.conjuge,
    CORRETOR: b.corretor,
    CONTRATADO: b.corretor,
    DADOS_CORRETOR: b.corretor,
    IMOVEL: b.imovel,
    DADOS_IMOVEL: b.imovel,
    DOCUMENTACAO_IMOVEL: b.documentacaoImovel,
    PRECO_CONDICOES: b.precoCondicoes,
    PRECO: b.precoCondicoes,
    EXCLUSIVIDADE: b.exclusividade,
    CLAUSULA_EXCLUSIVIDADE: b.exclusividade,
    AUTORIZACAO_VISITAS: b.autorizacaoVisitas,
    VISITAS: b.autorizacaoVisitas,
    AUTORIZACAO_DIVULGACAO: b.autorizacaoDivulgacao,
    DIVULGACAO: b.autorizacaoDivulgacao,
    AUTORIZACAO_PLACA: b.autorizacaoPlaca,
    AUTORIZACAO_FOTOS_VIDEOS: b.autorizacaoFotosVideos,
    AUTORIZACAO_PORTAIS_REDES: b.autorizacaoPortaisRedes,
    COMISSAO: b.comissao,
    CLAUSULA_COMISSAO: b.comissao,
    PARCERIA_CORRETORES: b.parceriaCorretores,
    PARCERIA: b.parceriaCorretores,
    PROTECAO_INTERESSADOS: b.protecaoInteressados,
    PROTECAO: b.protecaoInteressados,
    PRAZO: b.prazo,
    PRAZO_CONTRATO: b.prazo,
    RESCISAO: b.rescisao,
    CLAUSULA_RESCISAO: b.rescisao,
    FORO: b.foro,
    CLAUSULA_FORO: b.foro,
    ASSINATURAS: b.assinaturas,
    ASSINATURA_CONTRATANTE: b.assinaturas && data.assinaturas.signatarios.contratante,
    ASSINATURA_CONJUGE: b.assinaturas && data.assinaturas.signatarios.conjuge && b.conjuge,
    ASSINATURA_CORRETOR: b.assinaturas && data.assinaturas.signatarios.corretor,
    ASSINATURA_TESTEMUNHA1: b.assinaturas && data.assinaturas.signatarios.testemunha1,
    ASSINATURA_TESTEMUNHA2: b.assinaturas && data.assinaturas.signatarios.testemunha2,
  };

  return { tags, blocksFlags };
}

/**
 * Processa blocos condicionais e substituições no XML do Word
 */
export function processWordXmlModular(xml: string, tags: Record<string, string>, blocksFlags: Record<string, boolean>): string {
  let result = xml;

  // 1. Processa blocos condicionais: {{#NOME_BLOCO}} ... {{/NOME_BLOCO}} ou {{#BLOCO}} ... {{/BLOCO}}
  // Suporta variações com e sem tags XML no meio
  for (const [blockName, isVisible] of Object.entries(blocksFlags)) {
    const escapedName = blockName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Expressão regular ampla para capturar desde {{#BLOCO}} até {{/BLOCO}}
    const blockRegex = new RegExp(
      `\\{\\{#${escapedName}\\}\\}([\\s\\S]*?)\\{\\{/${escapedName}\\}\\}`,
      'gi'
    );

    if (isVisible) {
      // Se visível, remove apenas os marcadores de abertura e fechamento
      result = result.replace(blockRegex, '$1');
    } else {
      // Se invisível, remove o bloco inteiro sem deixar conteúdo residual
      result = result.replace(blockRegex, '');
    }
  }

  // 2. Remove possíveis parágrafos XML vazios gerados por remoção de blocos: <w:p>...</w:p> sem texto
  result = result.replace(/<w:p(?:\s+[^>]*)?>\s*(?:<w:pPr>[\s\S]*?<\/w:pPr>\s*)?<\/w:p>/g, '');

  // 3. Substitui todas as tags simples {{TAG}}
  for (const [key, value] of Object.entries(tags)) {
    const safeVal = (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Substitui variações {{TAG}}, {TAG}, [TAG], <<TAG>>
    const patterns = [
      new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'),
      new RegExp(`\\{${escapedKey}\\}`, 'g'),
      new RegExp(`\\[${escapedKey}\\]`, 'g'),
      new RegExp(`&lt;&lt;${escapedKey}&gt;&gt;`, 'g'),
    ];

    patterns.forEach(p => {
      result = result.replace(p, safeVal);
    });
  }

  return result;
}

/**
 * Preenche o arquivo .docx mantendo 100% da estrutura, cabeçalho, rodapé, imagens, tabelas e fontes originais
 */
export async function generateModularDocxBlob(
  templateBase64: string | undefined,
  formData: ContratoModularFormData
): Promise<Blob> {
  const { tags, blocksFlags } = buildModularReplacementData(formData);

  if (templateBase64) {
    try {
      // Decodifica o Base64 do .docx original do administrador
      const binaryString = atob(templateBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const zip = await JSZip.loadAsync(bytes.buffer);

      // Processa word/document.xml e todos os headers / footers se existirem
      const filesToProcess = Object.keys(zip.files).filter(fileName => 
        fileName === 'word/document.xml' || 
        fileName.startsWith('word/header') || 
        fileName.startsWith('word/footer')
      );

      for (const fileName of filesToProcess) {
        const file = zip.file(fileName);
        if (file) {
          const originalXml = await file.async('text');
          const modifiedXml = processWordXmlModular(originalXml, tags, blocksFlags);
          zip.file(fileName, modifiedXml);
        }
      }

      const generatedBuffer = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      return generatedBuffer;
    } catch (error) {
      console.warn('Erro ao processar template .docx base64 fornecido, utilizando gerador nativo:', error);
    }
  }

  // Se não houver template Base64 carregado, cria um documento .docx válido e estruturado via JSZip
  return createFallbackModularDocx(formData);
}

/**
 * Cria um arquivo DOCX padrão completo caso o usuário não tenha feito upload de um modelo externo
 */
async function createFallbackModularDocx(formData: ContratoModularFormData): Promise<Blob> {
  const zip = new JSZip();
  const htmlContent = generateModularContractHtml(formData);

  // Arquivos essenciais do padrão OpenXML (.docx)
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="23"/>
        <w:color w:val="222222"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  // Converte o texto das cláusulas selecionadas em parágrafos OpenXML
  const { paragraphs } = buildPlainTextClauses(formData);
  let docXmlBody = '';

  for (const p of paragraphs) {
    if (p.isTitle) {
      docXmlBody += `<w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="160"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0D5C3A"/></w:rPr><w:t>${escapeXml(p.text)}</w:t></w:r>
      </w:p>`;
    } else if (p.isHeading) {
      docXmlBody += `<w:p>
        <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(p.text)}</w:t></w:r>
      </w:p>`;
    } else if (p.isSignature) {
      docXmlBody += `<w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="280" w:after="60"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(p.text)}</w:t></w:r>
      </w:p>`;
    } else {
      docXmlBody += `<w:p>
        <w:pPr><w:jc w:val="both"/><w:spacing w:line="320" w:lineRule="auto" w:after="120"/></w:pPr>
        <w:r><w:t>${escapeXml(p.text)}</w:t></w:r>
      </w:p>`;
    }
  }

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docXmlBody}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Constrói a lista estruturada de parágrafos refletindo unicamente os blocos marcados
 */
export function buildPlainTextClauses(data: ContratoModularFormData) {
  const b = data.blocks;
  const paragraphs: Array<{ text: string; isTitle?: boolean; isHeading?: boolean; isSignature?: boolean }> = [];
  let clausulaIndex = 1;

  // Título
  paragraphs.push({
    text: data.tituloContrato || 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS E INTERMEDIAÇÃO IMOBILIÁRIA',
    isTitle: true,
  });

  // Preâmbulo: CONTRATANTE E CONTRATADO
  let preambuloParts: string[] = [];

  if (b.contratante) {
    let contratanteStr = `CONTRATANTE: ${data.contratante.nome || '_______________'}, nacionalidade ${data.contratante.nacionalidade || 'brasileira'}, estado civil ${data.contratante.estadoCivil || 'solteiro(a)'}, profissão ${data.contratante.profissao || '_______________'}, portador(a) do RG nº ${data.contratante.rg || '_______________'} e inscrito(a) no CPF sob o nº ${data.contratante.cpf || '_______________'}, residente e domiciliado(a) na ${data.contratante.endereco || '_______________'}, telefone ${data.contratante.telefone || '_______________'}`;
    
    if (b.conjuge && data.conjuge.nome) {
      contratanteStr += `, e seu(sua) cônjuge ${data.conjuge.nome}, portador(a) do RG nº ${data.conjuge.rg || '_______________'} e CPF nº ${data.conjuge.cpf || '_______________'}, profissão ${data.conjuge.profissao || '_______________'}, sob o regime de bens de ${data.conjuge.regimeBens || 'Comunhão Parcial de Bens'}`;
    }
    preambuloParts.push(contratanteStr + '.');
  }

  if (b.corretor) {
    const corretorStr = `CONTRATADO / CORRETOR: ${data.corretor.nome || '_______________'}, inscrito(a) no CPF/CNPJ sob o nº ${data.corretor.cpfCnpj || '_______________'}, inscrito no CRECI sob o nº ${data.corretor.creci || '_______________'}, com endereço profissional em ${data.corretor.endereco || '_______________'}, telefone ${data.corretor.telefone || '_______________'}.`;
    preambuloParts.push(corretorStr);
  }

  if (preambuloParts.length > 0) {
    paragraphs.push({ text: 'DAS PARTES', isHeading: true });
    paragraphs.push({ text: preambuloParts.join('\n\n') });
  }

  // 1. DO OBJETO / IMÓVEL
  if (b.imovel) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DO OBJETO E DO IMÓVEL`, isHeading: true });
    let imovelTexto = `O presente contrato tem como objeto o imóvel caracterizado como ${data.imovel.tipoImovel || 'Imóvel Residencial/Comercial'}, situado na ${data.imovel.endereco || '_______________'}, nº ${data.imovel.numero || 'S/N'}${data.imovel.complemento ? ', ' + data.imovel.complemento : ''}, Bairro ${data.imovel.bairro || '_______________'}, Cidade de ${data.imovel.cidade || '_______________'} - ${data.imovel.uf || 'UF'}, CEP ${data.imovel.cep || '_______________'}`;
    
    if (data.imovel.areaM2) imovelTexto += `, com área total de ${data.imovel.areaM2}`;
    if (data.imovel.lote && data.imovel.quadra) imovelTexto += `, constituído pelo Lote ${data.imovel.lote}, Quadra ${data.imovel.quadra}`;
    if (data.imovel.empreendimento) imovelTexto += `, integrante do Empreendimento/Loteamento ${data.imovel.empreendimento}`;
    imovelTexto += '.';

    if (b.documentacaoImovel) {
      imovelTexto += ` O imóvel possui como documento de propriedade: ${data.documentacaoImovel.documentoPropriedade || 'Matrícula Geral'}, sob a Matrícula nº ${data.documentacaoImovel.matricula || '_______________'} junto ao ${data.documentacaoImovel.cartorio || 'Cartório de Registro de Imóveis'}, e Inscrição Municipal nº ${data.documentacaoImovel.inscricaoMunicipal || '_______________'}.`;
      if (data.documentacaoImovel.outrosDados) {
        imovelTexto += ` Observações documentais: ${data.documentacaoImovel.outrosDados}.`;
      }
    }
    paragraphs.push({ text: imovelTexto });
  }

  // 2. PREÇO E CONDIÇÕES DE VENDA
  if (b.precoCondicoes) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DO PREÇO E CONDIÇÕES DE PAGAMENTO`, isHeading: true });
    const preco = data.precoCondicoes.precoVenda || (b.exclusividade ? data.exclusividade.precoAutorizadoVenda : 0);
    let precoTexto = `O imóvel será negociado pelo preço total de ${formatCurrency(preco)} (${valorPorExtenso(preco)}).`;
    if (data.precoCondicoes.condicoesPagamento) {
      precoTexto += ` As condições de pagamento acordadas compreendem: ${data.precoCondicoes.condicoesPagamento}.`;
    }
    if (data.precoCondicoes.observacoesComerciais) {
      precoTexto += ` Observações comerciais: ${data.precoCondicoes.observacoesComerciais}.`;
    }
    paragraphs.push({ text: precoTexto });
  }

  // 3. EXCLUSIVIDADE
  if (b.exclusividade) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DA EXCLUSIVIDADE NA INTERMEDIAÇÃO`, isHeading: true });
    const dtInicio = formatDateBR(data.exclusividade.dataInicio);
    const dtTermino = formatDateBR(data.exclusividade.dataTermino);
    const prazo = data.exclusividade.prazoDias || 90;
    let exclTexto = `O(A) CONTRATANTE concede ao(à) CONTRATADO(A) a EXCLUSIVIDADE para a intermediação e venda do imóvel acima descrito, com início em ${dtInicio || '___/___/______'}, pelo prazo de ${prazo} dias corridos, encerrando-se impreterivelmente em ${dtTermino || '___/___/______'}. Durante a vigência desta cláusula, o(a) CONTRATANTE se compromete a não outorgar poderes de venda a outros intermediadores nem negociar diretamente sem a devida remuneração ao corretor.`;
    if (data.exclusividade.observacoesExclusividade) {
      exclTexto += ` Disposições complementares: ${data.exclusividade.observacoesExclusividade}.`;
    }
    paragraphs.push({ text: exclTexto });
  }

  // 4. AUTORIZAÇÕES DE VISITA E DIVULGAÇÃO
  const temAutorizacoes = b.autorizacaoVisitas || b.autorizacaoDivulgacao || b.autorizacaoPlaca || b.autorizacaoFotosVideos || b.autorizacaoPortaisRedes || b.parceriaCorretores;
  if (temAutorizacoes) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DAS AUTORIZAÇÕES E DIVULGAÇÃO`, isHeading: true });
    const autorizacoesLista: string[] = [];

    if (b.autorizacaoVisitas) {
      autorizacoesLista.push('a) Realizar visitas ao imóvel acompanhado de potenciais compradores, mediante prévio agendamento');
    }
    if (b.autorizacaoFotosVideos) {
      autorizacoesLista.push('b) Produzir fotografias, vídeos, plantas e materiais audiovisuais do imóvel');
    }
    if (b.autorizacaoPlaca) {
      autorizacoesLista.push('c) Fixar placa, faixa ou totem de VENDE-SE / EXCLUSIVIDADE no imóvel');
    }
    if (b.autorizacaoPortaisRedes || b.autorizacaoDivulgacao) {
      autorizacoesLista.push('d) Divulgar o imóvel em portais imobiliários, websites, redes sociais e materiais de marketing');
    }
    if (b.parceriaCorretores) {
      autorizacoesLista.push('e) Estabelecer parcerias comerciais com outros corretores de imóveis e imobiliárias credenciadas (co-brokerage)');
    }

    paragraphs.push({
      text: `O(A) CONTRATANTE autoriza expressamente o(a) CONTRATADO(A) a:\n` + autorizacoesLista.join(';\n') + '.',
    });
  }

  // 5. COMISSÃO DE CORRETAGEM
  if (b.comissao || (b.exclusividade && data.exclusividade.percentualComissao)) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DA COMISSÃO DE CORRETAGEM`, isHeading: true });
    const pct = b.comissao ? data.comissao.percentual : data.exclusividade.percentualComissao;
    const vlr = b.comissao ? data.comissao.valorComissao : data.exclusividade.valorComissao;
    const forma = (b.comissao && data.comissao.formaPagamentoComissao) ? data.comissao.formaPagamentoComissao : 'no ato do recebimento do sinal ou formalização do negócio';

    const comissaoTexto = `Pelos serviços de intermediação imobiliária prestados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) a comissão de corretagem correspondente a ${pct}% (por cento) sobre o valor total da venda, resultando no montante de ${formatCurrency(vlr)} (${valorPorExtenso(vlr)}), a ser adimplido ${forma}. A remuneração é devida mesmo que a negociação seja concluída diretamente entre as partes caso tenha sido iniciada durante a vigência deste contrato.`;
    paragraphs.push({ text: comissaoTexto });
  }

  // 6. PROTEÇÃO DOS INTERESSADOS
  if (b.protecaoInteressados) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DA PROTEÇÃO DOS INTERESSADOS APRESENTADOS`, isHeading: true });
    const prazoProtecao = data.protecaoInteressados.prazoProtecaoDias || 180;
    let protTexto = `Fica estipulado que, mesmo após o término do prazo deste contrato, se a venda do imóvel for concretizada a qualquer interessado que tenha sido apresentado, cadastrado ou visitado o imóvel por intermédio do(a) CONTRATADO(A), no período de até ${prazoProtecao} dias subsequentes, a comissão de corretagem integral continuará sendo legalmente devida ao(à) CONTRATADO(A).`;
    if (data.protecaoInteressados.observacoes) {
      protTexto += ` Termos adicionais: ${data.protecaoInteressados.observacoes}.`;
    }
    paragraphs.push({ text: protTexto });
  }

  // 7. PRAZO DO CONTRATO
  if (b.prazo && !b.exclusividade) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DO PRAZO DE VIGÊNCIA`, isHeading: true });
    const dtInicio = formatDateBR(data.prazo.dataInicio);
    const dtTermino = formatDateBR(data.prazo.dataTermino);
    const qtdDias = data.prazo.quantidadeDias || 90;
    paragraphs.push({
      text: `O presente contrato vigorará pelo prazo de ${qtdDias} dias, com início em ${dtInicio || '___/___/______'} e término em ${dtTermino || '___/___/______'}, podendo ser renovado mediante termo aditivo acordado entre as partes.`,
    });
  }

  // 8. RESCISÃO
  if (b.rescisao) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DA RESCISÃO`, isHeading: true });
    const rescisaoTexto = data.rescisao.textoClausula || 
      `O presente contrato poderá ser rescindido por mútuo acordo ou por descumprimento de qualquer uma de suas cláusulas por qualquer das partes. Em caso de rescisão imotivada por parte do(a) CONTRATANTE durante a vigência do período de exclusividade ou após o início dos trabalhos de divulgação, será devida indenização correspondente a 50% (cinquenta por cento) dos honorários pactuados.`;
    paragraphs.push({ text: rescisaoTexto });
  }

  // 9. FORO
  if (b.foro) {
    paragraphs.push({ text: `CLÁUSULA ${clausulaIndex++}ª - DO FORO`, isHeading: true });
    const comarca = data.foro.comarca || 'Santarém';
    const uf = data.foro.uf || 'PA';
    paragraphs.push({
      text: `Para dirimir quaisquer controvérsias oriundas da interpretação ou execução deste instrumento, as partes elegem expressamente o Foro da Comarca de ${comarca} - ${uf}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
    });
  }

  // Fechamento de data
  const dataExtenso = formatDateExtenso(data.dataEmissao || new Date().toISOString().split('T')[0]);
  const cidadeForo = data.foro.comarca || 'Santarém';
  const ufForo = data.foro.uf || 'PA';
  paragraphs.push({
    text: `${cidadeForo} - ${ufForo}, ${dataExtenso}.`,
    isHeading: true,
  });

  // 10. ASSINATURAS
  if (b.assinaturas) {
    paragraphs.push({ text: 'ASSINATURAS DOS SIGNATÁRIOS', isHeading: true });
    const sig = data.assinaturas.signatarios;

    if (sig.contratante) {
      paragraphs.push({
        text: `___________________________________________________\n${data.contratante.nome || 'CONTRATANTE'}\nCPF: ${data.contratante.cpf || '000.000.000-00'}`,
        isSignature: true,
      });
    }

    if (sig.conjuge && b.conjuge && data.conjuge.nome) {
      paragraphs.push({
        text: `___________________________________________________\n${data.conjuge.nome} (CÔNJUGE)\nCPF: ${data.conjuge.cpf || '000.000.000-00'}`,
        isSignature: true,
      });
    }

    if (sig.corretor) {
      paragraphs.push({
        text: `___________________________________________________\n${data.corretor.nome || 'CONTRATADO / CORRETOR'}\nCRECI: ${data.corretor.creci || '0000'} | CPF/CNPJ: ${data.corretor.cpfCnpj || '000.000.000-00'}`,
        isSignature: true,
      });
    }

    if (sig.testemunha1) {
      paragraphs.push({
        text: `TESTEMUNHA 1: _____________________________________\nNome: ${data.assinaturas.testemunha1.nome || '_________________________________'}\nCPF: ${data.assinaturas.testemunha1.cpf || '___________________'}`,
        isSignature: true,
      });
    }

    if (sig.testemunha2) {
      paragraphs.push({
        text: `TESTEMUNHA 2: _____________________________________\nNome: ${data.assinaturas.testemunha2.nome || '_________________________________'}\nCPF: ${data.assinaturas.testemunha2.cpf || '___________________'}`,
        isSignature: true,
      });
    }
  }

  return { paragraphs };
}

/**
 * Gera o HTML profissional formatado para a Pré-Visualização ao Vivo e impressão/PDF
 */
export function generateModularContractHtml(data: ContratoModularFormData): string {
  const { paragraphs } = buildPlainTextClauses(data);

  const htmlParagraphs = paragraphs.map((p, idx) => {
    if (p.isTitle) {
      return `<h1 style="text-align: center; font-size: 18px; font-weight: 800; color: #047857; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #047857; padding-bottom: 12px;">${p.text}</h1>`;
    }
    if (p.isHeading) {
      return `<h2 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">${p.text}</h2>`;
    }
    if (p.isSignature) {
      const lines = p.text.split('\n');
      return `<div style="text-align: center; margin: 28px auto 16px auto; max-width: 420px; font-size: 11px; line-height: 1.6; color: #334155;">
        <div style="border-top: 1px solid #94a3b8; margin-bottom: 4px;"></div>
        <div style="font-weight: 700; color: #0f172a;">${lines[1] || ''}</div>
        <div style="color: #64748b;">${lines[2] || ''}</div>
      </div>`;
    }

    const formattedBody = p.text.replace(/\n\n/g, '</p><p style="margin-bottom: 12px; text-align: justify; line-height: 1.7; font-size: 12px; color: #334155;">').replace(/\n/g, '<br/>');
    return `<p style="margin-bottom: 12px; text-align: justify; line-height: 1.7; font-size: 12px; color: #334155;">${formattedBody}</p>`;
  }).join('');

  return `
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; background: #ffffff; color: #1e293b; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); max-width: 800px; margin: 0 auto;">
      ${htmlParagraphs}
    </div>
  `;
}
