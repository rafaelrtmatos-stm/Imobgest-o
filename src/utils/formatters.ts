/**
 * Formatadores e Utilitários para o Sistema Imobiliário
 */

export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/[^\d]/g, '');
  if (!clean) return 0;
  return parseFloat(clean) / 100;
}

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 11) {
    return maskCPF(clean);
  }
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskRG(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function formatDateBR(dateString: string | undefined | null): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString || '';
  }
}

export function formatDateExtenso(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return '';
  const dia = d.getDate();
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export function generateSaleCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `VND-${year}-${random}`;
}

export function generateVerificationHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const timestamp = Date.now().toString(16).toUpperCase().slice(-6);
  return `AUTH-${hex}-${timestamp}`;
}

/**
 * Converte valor numérico em reais por extenso
 */
export function valorPorExtenso(num: number): string {
  if (num === 0) return 'zero reais';
  if (isNaN(num)) return '';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const inteira = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - inteira) * 100);

  function converteGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;

    let res = '';
    if (c > 0) res += centenas[c];
    if (resto > 0) {
      if (res !== '') res += ' e ';
      if (resto < 10) {
        res += unidades[resto];
      } else if (resto < 20) {
        res += especiais[resto - 10];
      } else {
        res += dezenas[d];
        if (u > 0) res += ' e ' + unidades[u];
      }
    }
    return res;
  }

  let texto = '';
  const bilhoes = Math.floor(inteira / 1000000000);
  const milhoes = Math.floor((inteira % 1000000000) / 1000000);
  const milhares = Math.floor((inteira % 1000000) / 1000);
  const unidadesRestantes = inteira % 1000;

  if (bilhoes > 0) {
    texto += converteGrupo(bilhoes) + (bilhoes === 1 ? ' bilhão' : ' bilhões');
  }
  if (milhoes > 0) {
    if (texto !== '') texto += ', ';
    texto += converteGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
  }
  if (milhares > 0) {
    if (texto !== '') texto += ', ';
    if (milhares === 1) texto += 'mil';
    else texto += converteGrupo(milhares) + ' mil';
  }
  if (unidadesRestantes > 0) {
    if (texto !== '') texto += ' e ';
    texto += converteGrupo(unidadesRestantes);
  }

  if (inteira > 0) {
    texto += inteira === 1 ? ' real' : ' reais';
  }

  if (centavos > 0) {
    if (texto !== '') texto += ' e ';
    if (centavos < 10) {
      texto += unidades[centavos] + (centavos === 1 ? ' centavo' : ' centavos');
    } else if (centavos < 20) {
      texto += especiais[centavos - 10] + ' centavos';
    } else {
      const d = Math.floor(centavos / 10);
      const u = centavos % 10;
      let centStr = dezenas[d];
      if (u > 0) centStr += ' e ' + unidades[u];
      texto += centStr + ' centavos';
    }
  }

  return texto.trim();
}

export interface ParcelaSimulada {
  numero: number;
  dataVencimento: string;
  valor: number;
  saldoRestante: number;
}

export function gerarCronogramaParcelas(
  valorTotal: number,
  entrada: number,
  qtdParcelas: number,
  dataInicioVencimento: string
): ParcelaSimulada[] {
  if (qtdParcelas <= 0) return [];
  const saldoFinanciar = Math.max(0, valorTotal - entrada);
  const valorParcela = saldoFinanciar / qtdParcelas;

  let baseDate = new Date();
  if (dataInicioVencimento) {
    const parsed = new Date(dataInicioVencimento);
    if (!isNaN(parsed.getTime())) {
      baseDate = parsed;
    }
  }

  const parcelas: ParcelaSimulada[] = [];
  let saldo = saldoFinanciar;

  for (let i = 1; i <= qtdParcelas; i++) {
    const dataVenc = new Date(baseDate);
    dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
    saldo = Math.max(0, saldo - valorParcela);

    parcelas.push({
      numero: i,
      dataVencimento: dataVenc.toLocaleDateString('pt-BR'),
      valor: valorParcela,
      saldoRestante: saldo,
    });
  }

  return parcelas;
}

/**
 * Converte um percentual numérico em texto por extenso
 * Exemplo: 7 -> "sete por cento", 5.5 -> "cinco inteiros e cinco décimos por cento"
 */
export function percentualPorExtenso(num: number): string {
  if (num === 0) return 'zero por cento';
  if (isNaN(num)) return '';

  const inteira = Math.floor(Math.abs(num));
  const decimal = Math.round((Math.abs(num) - inteira) * 100);

  let textoInteiro = valorPorExtenso(inteira).replace(/ reais| real/g, '').trim();
  if (inteira === 0 && decimal > 0) textoInteiro = 'zero';

  if (decimal > 0) {
    const textoDecimal = valorPorExtenso(decimal).replace(/ reais| real/g, '').trim();
    return `${textoInteiro} vírgula ${textoDecimal} por cento`;
  }

  return `${textoInteiro} por cento`;
}

/**
 * Realiza o cálculo do parcelamento ajustando a última parcela para eliminar diferenças de centavos
 * saldo = valor_total - entrada
 * valor_parcela = saldo / quantidade_parcelas
 */
export function calcularParcelamentoAjustado(
  valorTotal: number,
  entrada: number,
  quantidadeParcelas: number
): {
  saldo: number;
  valorParcelaPadrao: number;
  valorUltimaParcela: number;
} {
  const qtd = Math.max(1, quantidadeParcelas || 1);
  const saldo = Math.max(0, valorTotal - (entrada || 0));
  
  // Parcela padrão arredondada para 2 casas
  const valorParcelaPadrao = Number((saldo / qtd).toFixed(2));
  
  // Soma das N-1 parcelas
  const somaPrimeiras = Number((valorParcelaPadrao * (qtd - 1)).toFixed(2));
  
  // Última parcela absorve a diferença de arredondamento
  const valorUltimaParcela = Number((saldo - somaPrimeiras).toFixed(2));

  return {
    saldo,
    valorParcelaPadrao,
    valorUltimaParcela,
  };
}

export function getDiaAssinatura(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return new Date().getDate().toString().padStart(2, '0');
  return d.getDate().toString().padStart(2, '0');
}

export function getMesAssinaturaExtenso(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  if (isNaN(d.getTime())) return meses[new Date().getMonth()];
  return meses[d.getMonth()];
}

export function getAnoAssinatura(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  if (isNaN(d.getTime())) return new Date().getFullYear().toString();
  return d.getFullYear().toString();
}
