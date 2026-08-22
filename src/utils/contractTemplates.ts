import { SaleRecord, TipoContrato } from '../types';
import {
  formatCurrency,
  formatDateBR,
  formatDateExtenso,
  valorPorExtenso,
  percentualPorExtenso,
  getDiaAssinatura,
  getMesAssinaturaExtenso,
  getAnoAssinatura
} from './formatters';
import { getStoredCompanyConfig } from './storage';

export type StandardContractCategory = 'a_vista' | 'parcelado' | 'exclusividade';

export function normalizeContractType(type?: TipoContrato | string): StandardContractCategory {
  if (!type) return 'parcelado';
  const t = type.toLowerCase();
  if (t === 'a_vista' || t === 'compra_venda_a_vista' || t === 'recibo_quitacao' || t === 'recibo_quitacao_a_vista' || t === 'venda_a_vista' || t === 'terreno_a_vista') {
    return 'a_vista';
  }
  if (t === 'exclusividade' || t === 'exclusividade_casas' || t === 'corretagem_cliente' || t === 'corretagem_exclusividade') {
    return 'exclusividade';
  }
  return 'parcelado';
}

export function getContractTitle(sale: SaleRecord): string {
  const norm = normalizeContractType(sale.tipoContrato);
  switch (norm) {
    case 'a_vista':
      return 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL (À VISTA)';
    case 'parcelado':
      return 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL (PARCELADO)';
    case 'exclusividade':
      return 'CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE';
  }
}

/**
 * Extrai todos os campos e variáveis de concordância e gênero
 */
export function getContractVariables(sale: SaleRecord) {
  const company = getStoredCompanyConfig();
  const contractDate = sale.createdAt ? sale.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];

  const buyer = sale.buyer;
  const property = sale.property;
  const financial = sale.financial;
  const seller = sale.seller;

  const isBuyerFemale = buyer.nome.trim().endsWith('a') || buyer.nome.trim().endsWith('e') && (buyer.estadoCivil?.includes('a') ?? false);
  const isSellerFemale = (seller.vendedorNome || '').trim().endsWith('a');

  const artigoVendedor = isSellerFemale ? 'a' : 'o';
  const tratamentoVendedor = isSellerFemale ? 'Sra.' : 'Sr.';
  const vendedor = seller.vendedorNome || company.nomeEmpresa || 'IMOBGESTÃO EMPREENDIMENTOS';
  const nacionalidadeVendedor = 'brasileira';
  const estadoCivilVendedor = 'casado(a)';
  const portadorVendedor = 'portador(a)';
  const rgVendedor = seller.vendedorCreci ? `${seller.vendedorCreci}` : '0000000';
  const emissaoRgVendedor = 'SSP/PA';
  const cpfVendedor = seller.vendedorCpfCnpj || company.cpfCnpj || '28.910.450/0001-90';
  const concordanciaVendedor = isSellerFemale ? 'a' : 'o';
  const enderecoVendedor = seller.vendedorEndereco || company.endereco || 'Av. Mendonça Furtado';
  const numeroVendedor = '1450';
  const bairroVendedor = 'Centro';
  const cidadeVendedor = company.cidade || property.cidade || 'Santarém';
  const estadoVendedor = company.estado || property.uf || 'PA';
  const vendedorTermo = isSellerFemale ? 'PROMITENTE VENDEDORA' : 'PROMITENTE VENDEDOR';

  const artigoComprador = isBuyerFemale ? 'a' : 'o';
  const tratamentoComprador = isBuyerFemale ? 'Sra.' : 'Sr.';
  const comprador = buyer.nome || 'COMPRADOR';
  const nacionalidadeComprador = buyer.nacionalidade || 'brasileiro(a)';
  const estadoCivilComprador = buyer.estadoCivil || 'solteiro(a)';
  const portadorComprador = 'portador(a)';
  const rgComprador = buyer.rg || '0000000';
  const emissaoRgComprador = 'SSP/PA';
  const cpfComprador = buyer.cpf || '000.000.000-00';
  const telefoneComprador = buyer.contato1 || buyer.contato2 || '(93) 99999-9999';
  const telefoneVendedor = seller.vendedorTelefone || company.telefone || '(93) 3522-8800';
  const concordanciaComprador = isBuyerFemale ? 'a' : 'o';
  const enderecoComprador = buyer.endereco || 'Rua Principal';
  const numeroComprador = buyer.numero || 'S/N';
  const bairroComprador = buyer.bairro || 'Centro';
  const cepComprador = buyer.cep || '68000-000';
  const cepVendedor = '68005-100';
  const cidadeComprador = buyer.cidade || property.cidade || 'Santarém';
  const estadoComprador = buyer.uf || property.uf || 'PA';
  const compradorTermo = isBuyerFemale ? 'PROMITENTE COMPRADORA' : 'PROMITENTE COMPRADOR';

  const quantidadeTerreno = '01 (um)';
  const localidade = property.localizacaoImovel || 'Área de Expansão Urbana / Curuá-Una';
  const empreendimento = property.empreendimento || 'Loteamento Residencial';
  const lote = property.lote || '01';
  const quadra = property.quadra || '01';
  const ruaDoLote = property.localizacaoImovel?.includes('Rua') ? property.localizacaoImovel : 'Rua Projetada';
  const frente = (property.frenteMetros || 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const lateralDireita = (property.ladoDireitoMetros || property.fundoMetros || 30).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const lateralEsquerda = (property.ladoEsquerdoMetros || property.fundoMetros || 30).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fundos = (property.fundoMetros || 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const areaTotal = (property.areaM2 || 300).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const valorTotalNum = financial.valorTotal || 0;
  const entradaNum = financial.entrada || 0;
  const restanteNum = Math.max(0, valorTotalNum - entradaNum);

  const valorTotal = formatCurrency(valorTotalNum).replace('R$', '').trim();
  const valorTotalExtenso = valorPorExtenso(valorTotalNum);
  const entrada = formatCurrency(entradaNum).replace('R$', '').trim();
  const entradaExtenso = valorPorExtenso(entradaNum);
  const restante = formatCurrency(restanteNum).replace('R$', '').trim();
  const restanteExtenso = valorPorExtenso(restanteNum);
  const quantidadeParcelas = String(financial.quantidadeParcelas || 1);
  const modoPagamento = 'mensais e consecutivas';
  const valorParcela = formatCurrency(financial.valorParcela || 0).replace('R$', '').trim();
  const valorParcelaExtenso = valorPorExtenso(financial.valorParcela || 0);

  let dataVencimento = '10';
  if (financial.diaVencimento) {
    dataVencimento = String(financial.diaVencimento);
  } else if (financial.dataVencimento && financial.dataVencimento.includes('-')) {
    dataVencimento = financial.dataVencimento.split('-')[2] || '10';
  }

  const dataPrimeiraParcela = formatDateBR(financial.dataPrimeiraParcela || financial.dataVencimento || contractDate);
  const dia = getDiaAssinatura(contractDate);
  const mesExtenso = getMesAssinaturaExtenso(contractDate);
  const ano = getAnoAssinatura(contractDate);

  const percentualCorretagem = seller.comissaoPercentual || 7;
  const percentualCorretagemExtenso = percentualPorExtenso(percentualCorretagem);

  return {
    artigoVendedor,
    tratamentoVendedor,
    vendedor,
    nacionalidadeVendedor,
    estadoCivilVendedor,
    portadorVendedor,
    rgVendedor,
    emissaoRgVendedor,
    cpfVendedor,
    concordanciaVendedor,
    enderecoVendedor,
    numeroVendedor,
    bairroVendedor,
    cidadeVendedor,
    estadoVendedor,
    vendedorTermo,
    artigoComprador,
    tratamentoComprador,
    comprador,
    nacionalidadeComprador,
    estadoCivilComprador,
    portadorComprador,
    rgComprador,
    emissaoRgComprador,
    cpfComprador,
    telefoneComprador,
    telefoneVendedor,
    concordanciaComprador,
    enderecoComprador,
    numeroComprador,
    bairroComprador,
    cepComprador,
    cepVendedor,
    cidadeComprador,
    estadoComprador,
    compradorTermo,
    quantidadeTerreno,
    localidade,
    empreendimento,
    lote,
    quadra,
    ruaDoLote,
    frente,
    lateralDireita,
    lateralEsquerda,
    fundos,
    areaTotal,
    valorTotal,
    valorTotalExtenso,
    entrada,
    entradaExtenso,
    restante,
    restanteExtenso,
    quantidadeParcelas,
    modoPagamento,
    valorParcela,
    valorParcelaExtenso,
    dataVencimento,
    dataPrimeiraParcela,
    dia,
    mesExtenso,
    ano,
    percentualCorretagem,
    percentualCorretagemExtenso,
    // Variáveis com tags exatas
    generoV: artigoVendedor === 'a' ? 'a' : 'o',
    generoV2: concordanciaVendedor,
    generoV3: artigoVendedor === 'a' ? 'A' : 'O',
    generoV4: artigoVendedor === 'a' ? 'à' : 'ao',
    generoC: artigoComprador === 'a' ? 'a' : 'o',
    generoC2: concordanciaComprador,
    generoC3: artigoComprador === 'a' ? 'A' : 'O',
    preposicaoComprador: artigoComprador === 'a' ? 'à' : 'ao',
  };
}

/**
 * Gera o texto HTML do contrato para visualização e impressão
 */
export function generateContractHTML(sale: SaleRecord): string {
  const norm = normalizeContractType(sale.tipoContrato);

  switch (norm) {
    case 'a_vista':
      return generateAVistaContractHTML(sale);
    case 'exclusividade':
      return generateExclusividadeContractHTML(sale);
    case 'parcelado':
    default:
      return generateParceladoContractHTML(sale);
  }
}

/**
 * 1. VENDA À VISTA (Recibo e Contrato com Quitação)
 */
function generateAVistaContractHTML(sale: SaleRecord): string {
  const v = getContractVariables(sale);

  return `
    <div class="contract-document space-y-6 text-slate-900 leading-relaxed text-justify text-sm sm:text-[15px] font-serif max-w-4xl mx-auto p-4 sm:p-8 bg-white">
      <!-- CABEÇALHO -->
      <div class="text-center pb-4 border-b-2 border-slate-900 mb-6">
        <h1 class="text-base sm:text-lg font-bold tracking-wider uppercase mb-1">
          INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL À VISTA
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 font-mono">
          Protocolo de Registro: <strong>${sale.codigoVenda}</strong> | Empreendimento: <strong>${v.empreendimento}</strong>
        </p>
      </div>

      <div class="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs font-mono text-emerald-900 font-bold mb-4">
        MODALIDADE: VENDA À VISTA — VALOR TOTAL: R$ ${v.valorTotal} (${v.valorTotalExtenso})
      </div>

      <p class="indent-8 text-justify">
        Pelo presente instrumento particular de compra e venda de imóvel, de um lado 
        <strong>${v.artigoVendedor} ${v.tratamentoVendedor} ${v.vendedor}</strong>, ${v.nacionalidadeVendedor}, ${v.estadoCivilVendedor}, ${v.portadorVendedor} da carteira de identidade nº ${v.rgVendedor} ${v.emissaoRgVendedor} e do CPF nº <strong>${v.cpfVendedor}</strong>, residente e domiciliad${v.concordanciaVendedor} na ${v.enderecoVendedor}, nº ${v.numeroVendedor}, Bairro ${v.bairroVendedor}, ${v.cidadeVendedor} - ${v.estadoVendedor}, ora em diante chamad${v.concordanciaVendedor} simplesmente <strong>${v.vendedorTermo}</strong>; e de outro lado 
        <strong>${v.artigoComprador} ${v.tratamentoComprador} ${v.comprador}</strong>, ${v.nacionalidadeComprador}, ${v.estadoCivilComprador}, ${v.portadorComprador} da carteira de identidade nº ${v.rgComprador} ${v.emissaoRgComprador} e do CPF nº <strong>${v.cpfComprador}</strong>, telefone ${v.telefoneComprador}, residente e domiciliad${v.concordanciaComprador} na ${v.enderecoComprador}, nº ${v.numeroComprador}, Bairro ${v.bairroComprador}, CEP ${v.cepComprador}, ${v.cidadeComprador} - ${v.estadoComprador}, ora em diante chamad${v.concordanciaComprador} simplesmente <strong>${v.compradorTermo}</strong>, têm, entre si, como justo e contratado o que se segue:
      </p>

      <div class="border-t border-slate-300 my-4"></div>

      <!-- 1º DO OBJETO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          1º - DO OBJETO
        </h3>
        <p class="indent-8 text-justify">
          A posse que exerce sobre <strong>${v.quantidadeTerreno}</strong> terreno rural, extraído de uma área localizada na <strong>${v.localidade}</strong>, no desmembramento do lote do Empreendimento <strong>${v.empreendimento}</strong>, no município de Santarém/PA, de forma regular. Denominado <strong>Lote ${v.lote}</strong> da <strong>Quadra ${v.quadra}</strong>, ${v.ruaDoLote}, medindo <strong>${v.frente}</strong> metros de frente, lateral direita medindo <strong>${v.lateralDireita}</strong> metros, lateral esquerda medindo <strong>${v.lateralEsquerda}</strong> metros e medindo <strong>${v.fundos}</strong> metros de fundos, com área total de <strong>${v.areaTotal}</strong> metros quadrados.
        </p>
        <p class="indent-8 text-justify">
          <strong>§ Parágrafo único</strong> - Pelo presente instrumento e na melhor forma de direito, ${v.generoV} <strong>${v.vendedorTermo}</strong>, tem ajustado vender conforme promete ${v.preposicaoComprador} <strong>${v.compradorTermo}</strong>, e este a comprar-lhe o imóvel descrito e caracterizado na cláusula anterior, de forma livre e desembaraçado de quaisquer ônus (real, pessoal, fiscal ou extrajudicial), dívidas, arrestos ou sequestros, ou ainda de restrições de qualquer natureza, pelo preço e de conformidade com as cláusulas e condições adiante estabelecidas.
        </p>
      </section>

      <div class="border-t border-slate-300 my-4"></div>

      <!-- 2º DA POSSE E SUAS OBRIGAÇÕES -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          2º - DA POSSE E SUAS OBRIGAÇÕES
        </h3>
        <p class="indent-8 text-justify">
          A posse do imóvel, objeto deste contrato, é transmitida pel${v.generoV} <strong>${v.vendedorTermo}</strong> ${v.preposicaoComprador} <strong>${v.compradorTermo}</strong> após a assinatura deste contrato.
        </p>
        <p class="indent-8 text-justify">
          <strong>§1º</strong> - A partir da posse do imóvel, correrão por conta exclusivas d${v.generoC} <strong>${v.compradorTermo}</strong> todos os impostos, taxas ou contribuições fiscais de qualquer natureza incidentes sobre o imóvel, ainda que lançados em nome d${v.generoV} <strong>${v.vendedorTermo}</strong> ou de terceiros, assim como serão, desde já, de sua inteira responsabilidade, as despesas com o registro deste contrato e outras decorrentes desta transação. É de inteira responsabilidade d${v.generoC} <strong>${v.compradorTermo}</strong>, questões, que envolvam a não observância da legislação ambientais e florestais brasileira.
        </p>
        <p class="indent-8 text-justify font-serif">
          E como de fato efetivamente vendido está o lote de terra acima caracterizado, livre e desembaraçado de quaisquer ônus, embargo judicial, ou extrajudicial, pelo preço e quantia certa de <strong>R$ ${v.valorTotal}</strong> (${v.valorTotalExtenso}), que ${v.concordanciaComprador} <strong>${v.compradorTermo}</strong> pagou e ${v.concordanciaComprador} <strong>${v.vendedorTermo}</strong> recebeu em moeda legal corrente do país, importância essa, que dá ao COMPRADOR pleno, geral e irrevogável quitação, cedendo e transferindo o mesmo, todo o domínio e direito de ação, servidões ativas e passivas, senhorio de posse, que até então mantinha mansa e pacificamente sobre o dito terreno, havendo-se ${v.concordanciaComprador} <strong>${v.compradorTermo}</strong> por bem deste recibo e da cláusula “constitui”, dele se empossado, obrigando-se ainda ${v.generoV2} <strong>${v.vendedorTermo}</strong>, por si seus sucessores e herdeiros a assinar a qualquer tempo os documentos necessários à completa transferência do imóvel ora vendido e a fazer essa venda sempre boa, firme e valiosa todo tempo, pondo ${v.concordanciaComprador} <strong>${v.compradorTermo}</strong> a salvo de cobranças e contestações futuras, e a responder à evicção de direitos.
        </p>
      </section>

      <div class="pt-6 text-center font-serif">
        <p class="font-bold text-slate-800 text-sm">
          Santarém/PA, ${v.dia} de ${v.mesExtenso} de ${v.ano}.
        </p>
      </div>

      <!-- ASSINATURAS -->
      <div class="pt-6 space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">${v.vendedorTermo} - ${v.vendedor}</p>
            <p class="text-xs text-slate-600">CPF/CNPJ nº ${v.cpfVendedor}</p>
          </div>
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">${v.compradorTermo} - ${v.comprador}</p>
            <p class="text-xs text-slate-600">CPF nº ${v.cpfComprador}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">1ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">2ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
        </div>
      </div>

      ${renderSignaturesBlock(sale.signatures, sale)}
    </div>
  `;
}

/**
 * 2. VENDA PARCELADA (Com as 15 Cláusulas Oficiais)
 */
function generateParceladoContractHTML(sale: SaleRecord): string {
  const v = getContractVariables(sale);

  return `
    <div class="contract-document space-y-6 text-slate-900 leading-relaxed text-justify text-sm sm:text-[15px] font-serif max-w-4xl mx-auto p-4 sm:p-8 bg-white">
      <!-- CABEÇALHO -->
      <div class="text-center pb-4 border-b-2 border-slate-900 mb-6">
        <h1 class="text-base sm:text-lg font-bold tracking-wider uppercase mb-1">
          INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL (PARCELADO)
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 font-mono">
          Protocolo de Registro: <strong>${sale.codigoVenda}</strong> | Empreendimento: <strong>${v.empreendimento}</strong>
        </p>
      </div>

      <div class="bg-blue-50 border border-blue-300 p-3 rounded-lg text-xs font-mono text-blue-900 font-bold mb-4">
        MODALIDADE: VENDA PARCELADA — VALOR TOTAL: R$ ${v.valorTotal} (ENTRADA: R$ ${v.entrada} + ${v.quantidadeParcelas}x DE R$ ${v.valorParcela})
      </div>

      <p class="indent-8 text-justify">
        Pelo presente instrumento particular de compra e venda de imóvel, de um lado 
        <strong>${v.artigoVendedor} ${v.tratamentoVendedor} ${v.vendedor}</strong>, ${v.nacionalidadeVendedor}, ${v.estadoCivilVendedor}, ${v.portadorVendedor} da carteira de identidade nº ${v.rgVendedor} ${v.emissaoRgVendedor} e do CPF nº <strong>${v.cpfVendedor}</strong>, residente e domiciliad${v.concordanciaVendedor} na ${v.enderecoVendedor}, nº ${v.numeroVendedor}, Bairro ${v.bairroVendedor}, ${v.cidadeVendedor} - ${v.estadoVendedor}, ora em diante chamad${v.concordanciaVendedor} simplesmente <strong>${v.vendedorTermo}</strong>; e de outro lado 
        <strong>${v.artigoComprador} ${v.tratamentoComprador} ${v.comprador}</strong>, ${v.nacionalidadeComprador}, ${v.estadoCivilComprador}, ${v.portadorComprador} da carteira de identidade nº ${v.rgComprador} ${v.emissaoRgComprador} e do CPF nº <strong>${v.cpfComprador}</strong>, telefone ${v.telefoneVendedor}, residente e domiciliad${v.concordanciaComprador} na ${v.enderecoComprador}, nº ${v.numeroComprador}, Bairro ${v.bairroComprador}, CEP ${v.cepVendedor}, ${v.cidadeComprador} - ${v.estadoComprador}, ora em diante chamad${v.concordanciaComprador} simplesmente <strong>${v.compradorTermo}</strong>, têm, entre si, como justo e contratado o que se segue:
      </p>

      <!-- 1º DO OBJETO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          1º - DO OBJETO
        </h3>
        <p class="indent-8 text-justify">
          A posse que exerce sobre <strong>${v.quantidadeTerreno}</strong> terreno rural, extraído de uma área localizada na <strong>${v.localidade}</strong>, no desmembramento do lote do Empreendimento <strong>${v.empreendimento}</strong>, no município de Santarém/PA, de forma regular. Denominado <strong>Lote ${v.lote}</strong> da <strong>Quadra ${v.quadra}</strong>, ${v.ruaDoLote}, medindo <strong>${v.frente}</strong> metros de frente, lateral direita medindo <strong>${v.lateralDireita}</strong> metros, lateral esquerda medindo <strong>${v.lateralEsquerda}</strong> metros e medindo <strong>${v.fundos}</strong> metros de fundos, com área total de <strong>${v.areaTotal}</strong> metros quadrados.
        </p>
        <p class="indent-8 text-justify">
          <strong>§ Parágrafo único</strong> - Pelo presente instrumento e na melhor forma de direito, ${v.generoV} <strong>${v.vendedorTermo}</strong>, tem ajustado vender conforme promete ${v.preposicaoComprador} <strong>${v.compradorTermo}</strong>, e este a comprar-lhe o imóvel descrito e caracterizado na cláusula anterior, de forma livre e desembaraçado de quaisquer ônus (real, pessoal, fiscal ou extrajudicial), dívidas, arrestos ou sequestros, ou ainda de restrições de qualquer natureza, pelo preço e de conformidade com as cláusulas e condições adiante estabelecidas.
        </p>
      </section>

      <!-- 2º DO VALOR -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          2º - DO VALOR
        </h3>
        <p class="indent-8 text-justify">
          O preço certa e ajustada da venda ora prometida é de <strong>R$ ${v.valorTotal}</strong> (${v.valorTotalExtenso}), sendo que o valor de <strong>R$ ${v.entrada}</strong> será pago a título de sinal na data da assinatura deste contrato e o restante do valor <strong>R$ ${v.restante}</strong> (${v.restanteExtenso}), através de <strong>${v.quantidadeParcelas}</strong> parcelas ${v.modoPagamento}, no valor de <strong>R$ ${v.valorParcela}</strong> (${v.valorParcelaExtenso}), com vencimento todo dia <strong>${v.dataVencimento}</strong>, ficando a primeira parcela para o dia <strong>${v.dataPrimeiraParcela}</strong> e o restante para os meses subsequentes.
        </p>
      </section>

      <!-- 3º DO INADIMPLEMENTO DA OBRIGAÇÃO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          3º - DO INADIMPLEMENTO DA OBRIGAÇÃO
        </h3>
        <p class="indent-8 text-justify">
          ${v.generoC3} <strong>${v.compradorTermo}</strong> obriga-se a pagar pontualmente cada uma das <strong>${v.quantidadeParcelas}</strong> parcelas ${v.generoV4} <strong>${v.vendedorTermo}</strong>, sob pena de, não o fazendo e sem prejuízo das demais sanções previstas em caso de inadimplemento, ficar sujeito ao pagamento de juros moratórios de 5% (cinco por cento) ao mês, calculado por dia a partir do vencimento da parcela em atraso. Além disso, após 90 (noventa) dias de inadimplemento, poderá ser exigido o pagamento de honorários advocatícios no valor de 10% (dez por cento), em caso de cobrança extrajudicial ou judicial.
        </p>
        <p class="indent-8 text-justify">
          <strong>§ 3º</strong> - ${v.generoC3} <strong>${v.compradorTermo}</strong> será notificado pelo <strong>${v.vendedorTermo}</strong>, caso não cumpra sua obrigação, conforme cláusula 9º §2º, sendo seu dever ressarcir os serviços.
        </p>
      </section>

      <!-- 4º DA PORCENTAGEM DA CORRETAGEM -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          4º - DA PORCENTAGEM DA CORRETAGEM
        </h3>
        <p class="indent-8 text-justify">
          Caso alguma parte vier a arrepender-se da presente transação, o valor correspondente a <strong>7%</strong> do valor total do objeto, destinado a pagamento de honorários de corretagem, não será ressarcido.
        </p>
      </section>

      <!-- 5º DA RESCISÃO CONTRATUAL E CONSEQUÊNCIAS -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          5º - DA RESCISÃO CONTRATUAL E CONSEQUÊNCIAS
        </h3>
        <p class="indent-8 text-justify">
          O presente contrato será rescindido 90 (noventa) dias após ${v.artigoComprador} <strong>${v.compradorTermo}</strong> deixar de pagar qualquer das parcelas pactuadas neste instrumento na data do vencimento. A rescisão se operará em favor d${v.generoC} <strong>${v.vendedorTermo}</strong>, independentemente de qualquer acordo judicial ou extrajudicial, e, como consequência, perderá ${v.artigoComprador} <strong>${v.compradorTermo}</strong>, desde logo, a posse do imóvel prometido, e o valor pago até a época do inadimplemento, abatidas as porcentagens contratuais e multa no valor total do objeto, conforme cláusula 3º, sendo devolvido parceladamente o restante descontado pel${v.generoC} <strong>${v.vendedorTermo}</strong>.
        </p>
        <p class="indent-8 text-justify">
          <strong>§1º</strong> - As benfeitorias e construções que ${v.artigoComprador} <strong>${v.compradorTermo}</strong> vier a realizar no imóvel deverão fazer parte integrante do mesmo, e em caso de rescisão do presente contrato, não terá o <strong>${v.comprador}</strong> direito a indenização, reembolso em obra ou benfeitorias feitas no terreno.
        </p>
      </section>

      <!-- 6º DO ARREPENDIMENTO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          6º - DO ARREPENDIMENTO
        </h3>
        <p class="indent-8 text-justify">
          Em caso de arrependimento d${v.artigoComprador} <strong>${v.compradorTermo}</strong>, este obedecerá ao Código de Defesa do Consumidor (Lei nº 8.078, de 11/09/1990), artigo 49, ou seja, prazo de <strong>07 (sete) dias</strong>.
        </p>
      </section>

      <!-- 7º DA DESISTÊNCIA -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          7º - DA DESISTÊNCIA
        </h3>
        <p class="indent-8 text-justify">
          A parte que desistir do negócio ou der causa à rescisão deste contrato arcará com multa de <strong>20% (vinte por cento)</strong> do valor do presente contrato, a ser pago à outra parte, sem prejuízo das perdas e danos decorrentes do ato.
        </p>
      </section>

      <!-- 8º DA POSSE E SUAS OBRIGAÇÕES -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          8º - DA POSSE E SUAS OBRIGAÇÕES
        </h3>
        <p class="indent-8 text-justify">
          A posse do imóvel, objeto deste contrato, é transmitida pel${v.generoC} <strong>${v.vendedorTermo}</strong> ${v.preposicaoComprador} <strong>${v.compradorTermo}</strong> após a assinatura deste contrato.
        </p>
        <p class="indent-8 text-justify">
          <strong>§1º</strong> - A partir da posse do imóvel, correrão por conta exclusivas d${v.artigoComprador} <strong>${v.compradorTermo}</strong> todos os impostos, taxas ou contribuições fiscais de qualquer natureza incidentes sobre o imóvel, ainda que lançados em nome d${v.generoC} <strong>${v.vendedorTermo}</strong> ou de terceiros, assim como serão, desde já, de sua inteira responsabilidade, as despesas com o registro deste contrato e outras decorrentes desta transação. É de inteira responsabilidade d${v.artigoComprador} <strong>${v.compradorTermo}</strong>, questões, que envolvam a não observância da legislação ambientais e florestais brasileira.
        </p>
        <p class="indent-8 text-justify">
          <strong>§2º</strong> - Fica advertido ${v.artigoComprador} <strong>${v.compradorTermo}</strong> de que a limpeza do lote é de sua obrigação, devendo retirar entulhos (ex.: árvores, restos de construção, matos), para não prejudicar outros lotes.
        </p>
      </section>

      <!-- 9º DA ANUÊNCIA -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          9º - DA ANUÊNCIA D${v.generoC3} ${v.vendedorTermo}
        </h3>
        <p class="indent-8 text-justify">
          ${v.generoC3} <strong>${v.compradorTermo}</strong> poderá ceder e transferir os direitos que lhes decorrem deste contrato apenas com anuência d${v.generoV} <strong>${v.vendedorTermo}</strong>. Caso faça a transferência sem comunicar, será considerado má-fé contratual, gerando nulidade absoluta perante terceiros.
        </p>
      </section>

      <!-- 10º DA IRREVOGABILIDADE E IRRETRATABILIDADE -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          10º - DA IRREVOGABILIDADE E IRRETRATABILIDADE
        </h3>
        <p class="indent-8 text-justify">
          O presente contrato é celebrado em caráter irrevogável e irretratável pel${v.generoV} <strong>${v.vendedorTermo}</strong> e <strong>${v.compradorTermo}</strong>, seus herdeiros e sucessores, excluindo-se expressamente a hipótese de arrependimento.
        </p>
      </section>

      <!-- 11º DA VISTORIA -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          11º - DA VISTORIA
        </h3>
        <p class="indent-8 text-justify">
          ${v.generoC3} <strong>${v.compradorTermo}</strong> viu, examinou e vistoriou o imóvel no local, e o aceita no estado em que se encontra.
        </p>
      </section>

      <!-- 12º DA NOTIFICAÇÃO E COBRANÇA -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          12º - DA NOTIFICAÇÃO E COBRANÇA
        </h3>
        <p class="indent-8 text-justify">
          ${v.generoV3} <strong>${v.vendedorTermo}</strong> fica autorizado pel${v.artigoComprador} <strong>${v.compradorTermo}</strong>, em caso de atraso, a notificar extrajudicialmente ou enviar mensagens de cobrança, em todas as vias disponíveis de comunicação (telefone, e-mail, WhatsApp, Facebook).
        </p>
      </section>

      <!-- 13º DA PROTEÇÃO DE DADOS -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          13º - DA PROTEÇÃO DE DADOS
        </h3>
        <p class="indent-8 text-justify">
          A Lei Geral de Proteção de Dados será obedecida, em todos os seus termos, pel${v.generoV} <strong>${v.vendedorTermo}</strong>, obrigando-se a tratar os dados d${v.artigoComprador} <strong>${v.compradorTermo}</strong> que forem eventualmente coletados, conforme sua necessidade ou obrigatoriedade.
        </p>
        <p class="indent-8 text-justify">
          <strong>§1º</strong> - Conforme prevê a LGPD, ${v.generoV} <strong>${v.vendedorTermo}</strong> obriga-se a tratar os dados d${v.artigoComprador} <strong>${v.compradorTermo}</strong> respeitando os princípios da finalidade, adequação, transparência, livre acesso, segurança, prevenção e não discriminação. (Art. 6º, LGPD).
        </p>
        <p class="indent-8 text-justify">
          <strong>§2º</strong> - Eventuais dados coletados pel${v.generoV} <strong>${v.vendedor}</strong> serão arquivados somente pelo tempo necessário para a execução dos serviços contratados. Ao seu fim, os dados serão permanentemente eliminados, exceto os que se enquadrarem no artigo 16, I da LGPD. (Art. 15, LGPD).
        </p>
      </section>

      <!-- 14º DO ÓBITO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          14º - DO ÓBITO D${v.generoC3} ${v.compradorTermo}
        </h3>
        <p class="indent-8 text-justify">
          Caso ${v.artigoComprador} <strong>${v.compradorTermo}</strong> venha a óbito durante a vigência do contrato, os herdeiros assumirão a dívida restante no prazo de 30 (trinta) dias. Caso os mesmos permaneçam inertes, ${v.generoV} <strong>${v.vendedorTermo}</strong> terá direito de reaver o imóvel, sem indenização de obras ou benfeitorias no terreno.
        </p>
      </section>

      <!-- 15º DA COMPETÊNCIA E FORO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          15º - DA COMPETÊNCIA E FORO
        </h3>
        <p class="indent-8 text-justify">
          Para dirimir quaisquer questões que direta ou indiretamente decorram deste contrato, as partes elegem o <strong>Foro da Comarca de Santarém/PA</strong>, com renúncia expressa de qualquer outro.
        </p>
        <p class="indent-8 text-justify">
          <strong>§1º</strong> - Para todos os fins de direito, os contratantes declaram aceitar o presente contrato nos termos em que foi lavrado, obrigando-se a si, seus herdeiros e sucessores a bem e fielmente cumpri-lo. E, por estarem assim ajustados, firmam o presente instrumento particular em 02 (duas) vias de igual teor e forma, na presença das testemunhas que também o assinam.
        </p>
      </section>

      <div class="pt-6 text-center font-serif">
        <p class="font-bold text-slate-800 text-sm">
          Santarém/PA, ${v.dia} de ${v.mesExtenso} de ${v.ano}.
        </p>
      </div>

      <!-- ASSINATURAS -->
      <div class="pt-6 space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">[VENDEDOR_TERMO] - ${v.vendedor}</p>
            <p class="text-xs text-slate-600">CPF nº ${v.cpfVendedor}</p>
          </div>
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">[COMPRADOR_TERMO] - ${v.comprador}</p>
            <p class="text-xs text-slate-600">CPF nº ${v.cpfComprador}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">1ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">2ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
        </div>
      </div>

      ${renderSignaturesBlock(sale.signatures, sale)}
    </div>
  `;
}

/**
 * 3. CONTRATO DE EXCLUSIVIDADE (COFECI & CÓDIGO CIVIL)
 */
function generateExclusividadeContractHTML(sale: SaleRecord): string {
  const v = getContractVariables(sale);
  const valorComissaoEstimada = formatCurrency((sale.financial.valorTotal * (v.percentualCorretagem || 7)) / 100);

  return `
    <div class="contract-document space-y-6 text-slate-900 leading-relaxed text-justify text-sm sm:text-[15px] font-serif max-w-4xl mx-auto p-4 sm:p-8 bg-white">
      <!-- CABEÇALHO OFICIAL COFECI -->
      <div class="text-center pb-4 border-b-2 border-slate-900 mb-6">
        <h1 class="text-base sm:text-lg font-bold tracking-wider uppercase mb-1">
          CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS
        </h1>
        <h2 class="text-sm sm:text-base font-bold tracking-wide uppercase text-slate-800">
          COM CLÁUSULA DE EXCLUSIVIDADE
        </h2>
        <p class="text-xs text-slate-600 font-mono mt-1">
          (Arts. 722 a 729 do Novo Código Civil c/c Art. 20, III da Lei nº 6.530/78 e Resolução – COFECI Nº 458/95)
        </p>
        <p class="text-[11px] text-slate-500 font-mono mt-0.5">
          Registro Nº: <strong>${sale.codigoVenda}</strong> | Município de Santarém/PA
        </p>
      </div>

      <!-- QUALIFICAÇÃO DAS PARTES -->
      <section class="space-y-3">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide border-b border-slate-300 pb-1">
          DAS PARTES CONTRATANTES
        </h3>
        
        <p class="indent-8 text-justify">
          <strong>CONTRATANTE (PROPRIETÁRIO/VENDEDOR):</strong> 
          <strong>${v.comprador.toUpperCase()}</strong>, nacionalidade ${v.nacionalidadeComprador}, estado civil <strong>${v.estadoCivilComprador}</strong>, portador(a) do RG nº <strong>${v.rgComprador}</strong> ${v.emissaoRgComprador}, inscrito(a) no CPF/MF sob o nº <strong>${v.cpfComprador}</strong>, residente e domiciliado(a) na ${v.enderecoComprador}, nº ${v.numeroComprador}, Bairro ${v.bairroComprador}, CEP ${v.cepComprador}, na cidade de <strong>${v.cidadeComprador} - ${v.estadoComprador}</strong>, contato telefônico <strong>${v.telefoneComprador}</strong>.
        </p>

        <p class="indent-8 text-justify">
          <strong>CONTRATADO(A) (CORRETOR DE IMÓVEIS / IMOBILIÁRIA):</strong> 
          <strong>${v.vendedor.toUpperCase()}</strong>, inscrito(a) no CPF/CNPJ sob o nº <strong>${v.cpfVendedor}</strong>, CRECI nº <strong>${v.rgVendedor}</strong>, estabelecido(a) na ${v.enderecoVendedor}, nº ${v.numeroVendedor}, Bairro ${v.bairroVendedor}, cidade de <strong>${v.cidadeVendedor} - ${v.estadoVendedor}</strong>, telefone <strong>${v.telefoneVendedor}</strong>.
        </p>
      </section>

      <!-- CLÁUSULA 1ª: DO OBJETO E EXCLUSIVIDADE -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 1ª — DO OBJETO E DA EXCLUSIVIDADE
        </h3>
        <p class="indent-8 text-justify">
          O CONTRATANTE confere ao CONTRATADO <strong>EXCLUSIVIDADE ABSOLUTA</strong> para promover e intermediar a venda do bem imóvel de sua propriedade, situado no Empreendimento <strong>${v.empreendimento}</strong>, denominado <strong>Lote ${v.lote} da Quadra ${v.quadra}</strong>, ${v.ruaDoLote}, medindo ${v.frente}m de frente por ${v.fundos}m de fundos, com área total de <strong>${v.areaTotal} m²</strong>, no município de <strong>Santarém/PA</strong>.
        </p>
        <p class="indent-8 text-justify">
          <strong>Parágrafo Único:</strong> Durante a vigência da exclusividade acordada neste instrumento, o CONTRATADO terá o direito exclusivo de ofertar o imóvel a terceiros, não podendo o CONTRATANTE negociar diretamente ou através de outros intermediadores sem a expressa anuência e remuneração do CONTRATADO.
        </p>
      </section>

      <!-- CLÁUSULA 2ª: DO VALOR E CONDIÇÕES DE VENDA -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 2ª — DO VALOR DA OFERTA E CONDIÇÕES COMERCIAIS
        </h3>
        <p class="indent-8 text-justify">
          O imóvel será anunciado e comercializado pelo preço estipulado de <strong>R$ ${v.valorTotal}</strong> (${v.valorTotalExtenso}), admitindo-se propostas com pagamento à vista ou parcelado mediante aprovação prévia do CONTRATANTE.
        </p>
      </section>

      <!-- CLÁUSULA 3ª: DOS HONORÁRIOS DE CORRETAGEM -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 3ª — DOS HONORÁRIOS PROFISSIONAIS DE CORRETAGEM
        </h3>
        <p class="indent-8 text-justify">
          Pela prestação dos serviços de intermediação e corretagem imobiliária, o CONTRATANTE pagará ao CONTRATADO a comissão de <strong>${v.percentualCorretagem}% (${v.percentualCorretagemExtenso})</strong> sobre o valor efetivo da venda do imóvel, calculada em <strong>${valorComissaoEstimada}</strong>, a ser liquidada no ato da assinatura do compromisso ou do recebimento do sinal.
        </p>
        <p class="indent-8 text-justify">
          <strong>Parágrafo Único:</strong> Conforme preceitua o <strong>Art. 726 do Código Civil</strong>, iniciada e concluída a mediação com a assinatura da proposta ou contrato, ou havendo venda durante o prazo de exclusividade por iniciativa do próprio proprietário ou de terceiros, a remuneração integral de corretagem continuará sendo devida ao CONTRATADO.
        </p>
      </section>

      <!-- CLÁUSULA 4ª: DO PRAZO DE EXCLUSIVIDADE -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 4ª — DO PRAZO DE VIGÊNCIA E PRORROGAÇÃO
        </h3>
        <p class="indent-8 text-justify">
          O presente contrato vigorará pelo prazo de <strong>90 (noventa) dias</strong> a contar da assinatura deste instrumento, renovando-se automaticamente por igual período caso nenhuma das partes se manifeste formalmente em contrário com antecedência de 10 (dez) dias do seu termo final.
        </p>
      </section>

      <!-- CLÁUSULA 5ª: DAS OBRIGAÇÕES DAS PARTES -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 5ª — DAS OBRIGAÇÕES DO CONTRATADO E DO CONTRATANTE
        </h3>
        <p class="indent-8 text-justify">
          O CONTRATADO se compromete a divulgar o imóvel através de canais digitais, redes sociais, placas e mídias imobiliárias, prestando contas de eventuais interessados e mantendo sigilo e zelo profissional. O CONTRATANTE obriga-se a franquear o acesso ao imóvel para vistorias acompanhadas e fornecer todas as certidões necessárias para a segurança jurídica da transmissão.
        </p>
      </section>

      <!-- CLÁUSULA 6ª: DA PROTEÇÃO DE DADOS (LGPD) -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 6ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
        </h3>
        <p class="indent-8 text-justify">
          As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizando os dados pessoais coletados exclusivamente para os propósitos de prospecção, qualificação jurídica e conclusão da transação imobiliária.
        </p>
      </section>

      <!-- CLÁUSULA 7ª: DO FORO -->
      <section class="space-y-2">
        <h3 class="font-bold uppercase text-sm sm:text-base text-slate-900 tracking-wide">
          CLÁUSULA 7ª — DO FORO DE ELEIÇÃO
        </h3>
        <p class="indent-8 text-justify">
          Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o <strong>Foro da Comarca de Santarém/PA</strong>, renunciando a qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      <div class="pt-6 text-center font-serif">
        <p class="font-bold text-slate-800 text-sm">
          Santarém/PA, ${v.dia} de ${v.mesExtenso} de ${v.ano}.
        </p>
      </div>

      <!-- ASSINATURAS -->
      <div class="pt-6 space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">CONTRATADO (CORRETOR RESPONSÁVEL)</p>
            <p class="text-xs font-semibold text-slate-800">${v.vendedor}</p>
            <p class="text-xs text-slate-600">CRECI: ${v.rgVendedor}</p>
          </div>
          <div class="border-t border-slate-900 pt-2">
            <p class="font-bold uppercase text-xs sm:text-sm">CONTRATANTE (PROPRIETÁRIO)</p>
            <p class="text-xs font-semibold text-slate-800">${v.comprador}</p>
            <p class="text-xs text-slate-600">CPF nº ${v.cpfComprador}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">1ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p class="text-xs text-slate-700 font-semibold">2ª Testemunha: _______________________</p>
            <p class="text-[11px] text-slate-500">CPF:</p>
          </div>
        </div>
      </div>

      ${renderSignaturesBlock(sale.signatures, sale)}
    </div>
  `;
}

function renderSignaturesBlock(signatures: SaleRecord['signatures'], sale: SaleRecord): string {
  const buyer = signatures?.buyer;
  const seller = signatures?.seller;
  const witness1 = signatures?.witness1;
  const witness2 = signatures?.witness2;
  const isSigned = signatures?.isFullySigned || !!buyer?.signatureImage;

  return `
    <div class="mt-8 pt-6 border-t-2 border-slate-800 space-y-6 font-sans no-print">
      <div class="text-center">
        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
          TERMO DE ASSINATURA ELETRÔNICA & AUTENTICAÇÃO DIGITAL
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Hash de Integridade do Documento: <span class="font-mono font-semibold text-slate-800">${signatures?.contractHash || 'PENDENTE DE ASSINATURA'}</span>
        </p>
      </div>

      <!-- GRID DE ASSINATURAS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <!-- COMPRADOR / CONTRATANTE -->
        <div class="border border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col justify-between shadow-xs">
          <div class="min-h-[70px] flex items-center justify-center border-b border-dashed border-slate-300 pb-2">
            ${buyer?.signatureImage ? `
              <img src="${buyer.signatureImage}" alt="Assinatura Comprador" class="max-h-16 max-w-full object-contain mx-auto" />
            ` : `
              <div class="text-xs text-slate-400 italic py-4">Aguardando assinatura digital na tela</div>
            `}
          </div>
          <div class="text-center pt-2 text-xs">
            <p class="font-bold text-slate-900">${buyer?.name || sale.buyer.nome}</p>
            <p class="text-slate-600">CPF: ${buyer?.documentNumber || sale.buyer.cpf} (${buyer?.role || 'Comprador(a)'})</p>
            ${buyer?.signedAt ? `
              <div class="mt-1 text-[11px] text-emerald-700 font-medium">
                [Assinado Digitalmente] em ${formatDateBR(buyer.signedAt.split('T')[0])} às ${buyer.signedAt.includes('T') ? buyer.signedAt.split('T')[1].slice(0, 5) : ''}
                ${buyer.ipAddress ? `<span class="block text-[10px] text-slate-500">IP: ${buyer.ipAddress}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- CORRETOR / VENDEDOR -->
        <div class="border border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col justify-between shadow-xs">
          <div class="min-h-[70px] flex items-center justify-center border-b border-dashed border-slate-300 pb-2">
            ${seller?.signatureImage ? `
              <img src="${seller.signatureImage}" alt="Assinatura Vendedor" class="max-h-16 max-w-full object-contain mx-auto" />
            ` : `
              <div class="text-xs text-slate-400 italic py-4">Aguardando assinatura digital na tela</div>
            `}
          </div>
          <div class="text-center pt-2 text-xs">
            <p class="font-bold text-slate-900">${seller?.name || sale.seller.vendedorNome}</p>
            <p class="text-slate-600">${seller?.documentNumber || `CRECI ${sale.seller.vendedorCreci}`}</p>
            ${seller?.signedAt ? `
              <div class="mt-1 text-[11px] text-emerald-700 font-medium">
                [Assinado Digitalmente] em ${formatDateBR(seller.signedAt.split('T')[0])} às ${seller.signedAt.includes('T') ? seller.signedAt.split('T')[1].slice(0, 5) : ''}
                ${seller.ipAddress ? `<span class="block text-[10px] text-slate-500">IP: ${seller.ipAddress}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- CARIMBO DE CONFORMIDADE LEGAL -->
      <div class="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 border border-slate-200 text-center">
        <p class="font-semibold text-slate-800">
          Documento Eletrônico com Validade Jurídica Conforme MP nº 2.200-2/2001 e Lei Federal nº 14.063/2020
        </p>
        <p class="mt-0.5 text-slate-500">
          A autenticidade deste instrumento é garantida pelo carimbo de tempo, dados cadastrais e hash criptográfico gerados pelo sistema ImobGestão.
        </p>
      </div>
    </div>
  `;
}
