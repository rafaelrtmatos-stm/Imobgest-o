import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  DollarSign, 
  UserCheck, 
  FileText, 
  MapPin, 
  Map,
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  BuyerData, 
  Corretor, 
  Empreendimento, 
  EstadoCivil, 
  FinancialData, 
  PropertyData, 
  SaleRecord, 
  SellerData, 
  TipoContrato, 
  TipoPagamento 
} from '../types';
import { 
  formatCurrency, 
  generateSaleCode, 
  maskCEP, 
  maskCPF, 
  maskPhone, 
  maskRG
} from '../utils/formatters';

interface SalesFormProps {
  empreendimentos: Empreendimento[];
  corretores: Corretor[];
  initialSaleData?: SaleRecord | null;
  onSaveSale: (sale: SaleRecord, openContract: boolean, openSignatureModal: boolean) => void;
  onOpenMap: (empreendimentoId: string) => void;
  onOpenWordGenerator?: (sale: SaleRecord, defaultMode?: 'a_vista' | 'parcelado') => void;
}

export const SalesForm: React.FC<SalesFormProps> = ({
  empreendimentos,
  corretores,
  initialSaleData,
  onSaveSale,
  onOpenMap,
  onOpenWordGenerator,
}) => {
  // ==========================================
  // OS 19 CAMPOS SOLICITADOS:
  // 1. NOME
  // 2. RG
  // 3. CPF
  // 4. DATA DE NASCIMENTO
  // 5. ESTADO CIVIL
  // 6. ENDEREÇO
  // 7. N°
  // 8. BAIRRO
  // 9. CEP
  // 10. CONTATO(1)
  // 11. CONTATO(2)
  // 12. LOTE
  // 13. QUADRA
  // 14. EMPREENDIMENTO
  // 15. VALOR TOTAL
  // 16. ENTRADA
  // 17. QUANTIDADE DE PARCELAS
  // 18. DATA DE VENCIMENTO
  // 19. VENDEDOR
  // ==========================================

  // Dados do Comprador
  const [nome, setNome] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>('Solteiro(a)');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [contato1, setContato1] = useState('');
  const [contato2, setContato2] = useState('');

  // Dados do Imóvel
  const [lote, setLote] = useState('Lote 01');
  const [quadra, setQuadra] = useState('Quadra 01');
  const [selectedEmpreendimentoId, setSelectedEmpreendimentoId] = useState(empreendimentos[0]?.id || '');

  // Condições Financeiras
  const [valorTotal, setValorTotal] = useState<number>(180000);
  const [entrada, setEntrada] = useState<number>(20000);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(120);
  const [dataVencimento, setDataVencimento] = useState<string>('2026-09-10');

  // Vendedor
  const [selectedCorretorId, setSelectedCorretorId] = useState(corretores[0]?.id || '');

  // Feedback & Loading
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carrega dados iniciais se estiver editando ou se vier do mapa
  useEffect(() => {
    if (initialSaleData) {
      const b = initialSaleData.buyer;
      const p = initialSaleData.property;
      const f = initialSaleData.financial;
      const s = initialSaleData.seller;

      setNome(b.nome || '');
      setRg(b.rg || '');
      setCpf(b.cpf || '');
      setDataNascimento(b.dataNascimento || '');
      setEstadoCivil(b.estadoCivil || 'Solteiro(a)');
      setEndereco(b.endereco || '');
      setNumero(b.numero || '');
      setBairro(b.bairro || '');
      setCep(b.cep || '');
      setContato1(b.contato1 || '');
      setContato2(b.contato2 || '');

      setLote(p.lote || 'Lote 01');
      setQuadra(p.quadra || 'Quadra 01');
      setSelectedEmpreendimentoId(p.empreendimentoId || empreendimentos[0]?.id || '');

      setValorTotal(f.valorTotal || 180000);
      setEntrada(f.entrada || 20000);
      setQuantidadeParcelas(f.quantidadeParcelas || 120);
      setDataVencimento(f.dataVencimento || '2026-09-10');

      setSelectedCorretorId(s.vendedorId || corretores[0]?.id || '');
    }
  }, [initialSaleData, empreendimentos, corretores]);

  // Busca endereço automático ao preencher CEP (ViaCEP)
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          if (data.logradouro && !endereco) setEndereco(data.logradouro);
          if (data.bairro && !bairro) setBairro(data.bairro);
        }
      } catch (err) {
        console.error('Erro ao consultar CEP:', err);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const currentEmpreendimento = empreendimentos.find(e => e.id === selectedEmpreendimentoId) || empreendimentos[0];
  const currentCorretor = corretores.find(c => c.id === selectedCorretorId) || corretores[0];

  // Cálculos dinâmicos
  const saldoFinanciar = Math.max(0, valorTotal - entrada);
  const valorParcelaCalculado = quantidadeParcelas > 0 
    ? Number((saldoFinanciar / quantidadeParcelas).toFixed(2)) 
    : 0;
  const comissaoPercentual = currentCorretor?.comissaoPadraoPercentual || 5.0;
  const valorComissaoCalculado = Number(((valorTotal * comissaoPercentual) / 100).toFixed(2));

  const handleSave = (
    openContract: boolean, 
    openSignatureModal: boolean, 
    openWordModal: boolean = false,
    forcedMode?: 'a_vista' | 'parcelado'
  ) => {
    setValidationError(null);

    // Validações
    if (!nome.trim()) {
      setValidationError('Por favor, informe o NOME do comprador.');
      return;
    }
    if (!cpf.trim()) {
      setValidationError('Por favor, informe o CPF do comprador.');
      return;
    }
    if (!contato1.trim()) {
      setValidationError('Por favor, informe o CONTATO(1) do comprador.');
      return;
    }
    if (valorTotal <= 0) {
      setValidationError('O VALOR TOTAL deve ser maior que zero.');
      return;
    }

    const buyer: BuyerData = {
      nome: nome.trim(),
      rg: rg.trim() || 'Não informado',
      cpf: cpf.trim(),
      dataNascimento,
      estadoCivil,
      profissao: 'Não informada',
      nacionalidade: 'Brasileira',
      endereco: endereco.trim() || 'Rua Principal',
      numero: numero.trim() || 'S/N',
      bairro: bairro.trim() || 'Centro',
      cep: cep.trim() || '74000-000',
      cidade: currentEmpreendimento?.cidade || 'Goiânia',
      uf: currentEmpreendimento?.uf || 'GO',
      contato1: contato1.trim(),
      contato2: contato2.trim(),
    };

    const property: PropertyData = {
      empreendimento: currentEmpreendimento?.nome || 'Loteamento',
      empreendimentoId: currentEmpreendimento?.id || 'emp-1',
      quadra: quadra.trim() || 'Quadra 01',
      lote: lote.trim() || 'Lote 01',
      areaM2: 360,
      cidade: currentEmpreendimento?.cidade || 'Goiânia',
      uf: currentEmpreendimento?.uf || 'GO',
      matricula: currentEmpreendimento?.matriculaGeral,
      registroCartorio: currentEmpreendimento?.cartorioRegistro,
    };

    // Inteligência Financeira: Se falta parcela / valor total quitado = À Vista. Se tem parcelas = Parcelado
    const hasParcelas = quantidadeParcelas > 1 && saldoFinanciar > 0;
    const isAVista = !hasParcelas;
    const tipoPagamento: TipoPagamento = isAVista ? 'a_vista' : 'parcelado';
    const tipoContrato: TipoContrato = isAVista ? 'compra_venda_a_vista' : 'compra_venda_parcelado';

    const financial: FinancialData = {
      tipoPagamento,
      valorTotal: Number(valorTotal),
      entrada: Number(entrada),
      quantidadeParcelas: Number(quantidadeParcelas) || 1,
      dataVencimento,
      valorParcela: valorParcelaCalculado,
      taxaJurosMensal: 0.5,
      indiceReajuste: 'IPCA',
      formaPagamentoEntrada: 'Pix',
    };

    const seller: SellerData = {
      vendedorId: currentCorretor?.id || 'corretor-1',
      vendedorNome: currentCorretor?.nome || 'Corretor',
      vendedorCreci: currentCorretor?.creci || 'CRECI',
      vendedorTelefone: currentCorretor?.telefone || '',
      vendedorEmail: currentCorretor?.email || '',
      comissaoPercentual: comissaoPercentual,
      comissaoValor: valorComissaoCalculado,
      comissaoStatus: initialSaleData?.seller?.comissaoStatus || 'pendente',
    };

    const now = new Date().toISOString().split('T')[0];
    const saleId = initialSaleData?.id || `sale-${Date.now()}`;
    const codigoVenda = initialSaleData?.codigoVenda || generateSaleCode();

    const saleRecord: SaleRecord = {
      id: saleId,
      codigoVenda,
      createdAt: initialSaleData?.createdAt || now,
      updatedAt: now,
      status: initialSaleData?.status || 'pendente_assinatura',
      tipoContrato,
      buyer,
      property,
      financial,
      seller,
      signatures: initialSaleData?.signatures || {
        buyer: {
          name: buyer.nome,
          role: 'Comprador(a)',
          documentNumber: buyer.cpf,
          signatureImage: null,
          signedAt: null,
        },
        seller: {
          name: seller.vendedorNome,
          role: 'Corretor(a) / Vendedor(a)',
          documentNumber: `CRECI ${seller.vendedorCreci}`,
          signatureImage: null,
          signedAt: null,
        },
        isFullySigned: false,
      },
    };

    onSaveSale(saleRecord, openContract, openSignatureModal);
    if (openWordModal && onOpenWordGenerator) {
      const modeToOpen = forcedMode || (isAVista ? 'a_vista' : 'parcelado');
      onOpenWordGenerator(saleRecord, modeToOpen);
    }
    setSuccessMessage(`Venda ${codigoVenda} registrada com sucesso!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* CABEÇALHO DO LANÇAMENTO */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-l-4 border-l-emerald-600 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                LANÇAMENTO DIRETO
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {initialSaleData ? `Editando: ${initialSaleData.codigoVenda}` : 'Registro de Venda'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Cadastro de Venda de Imóvel
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Preencha os 19 dados cadastrais para gerar o contrato jurídico e coletar as assinaturas.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOpenMap(selectedEmpreendimentoId)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold rounded-xl transition-all border border-emerald-300 shadow-xs cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Ver Mapa de Lotes</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE ERRO OU SUCESSO */}
        {validationError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs sm:text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-400 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(true, false); }} className="space-y-6">
        
        {/* GRUPO 1: DADOS DO COMPRADOR */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-t-4 border-t-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Qualificação do Comprador</h2>
              <p className="text-xs text-slate-500">Identificação civil e residencial</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. NOME */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                NOME: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo do comprador"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-semibold text-slate-900"
              />
            </div>

            {/* 2. RG */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                RG: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-rg"
                type="text"
                required
                value={rg}
                onChange={(e) => setRg(maskRG(e.target.value))}
                placeholder="Ex: 5.123.456 SSP/GO"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900"
              />
            </div>

            {/* 3. CPF */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                CPF: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-cpf"
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900"
              />
            </div>

            {/* 4. DATA DE NASCIMENTO */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                DATA DE NASCIMENTO: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-nascimento"
                type="date"
                required
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm text-slate-900 font-mono"
              />
            </div>

            {/* 5. ESTADO CIVIL */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                ESTADO CIVIL: <span className="text-rose-500">*</span>
              </label>
              <select
                id="input-estado-civil"
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-semibold text-slate-900 cursor-pointer"
              >
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="União Estável">União Estável</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="Separado(a)">Separado(a)</option>
              </select>
            </div>

            {/* 6. ENDEREÇO */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                ENDEREÇO: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-endereco"
                type="text"
                required
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, Avenida, Alameda..."
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm text-slate-900"
              />
            </div>

            {/* 7. N° */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                N°: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-numero"
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 120 ou S/N"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm text-slate-900 font-mono"
              />
            </div>

            {/* 8. BAIRRO */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                BAIRRO: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-bairro"
                type="text"
                required
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Setor Central"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm text-slate-900"
              />
            </div>

            {/* 9. CEP */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                CEP: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-cep"
                  type="text"
                  required
                  value={cep}
                  onChange={(e) => setCep(maskCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900 pr-10"
                />
                {isLoadingCep && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* 10. CONTATO(1) */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                CONTATO(1): <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-contato1"
                type="text"
                required
                value={contato1}
                onChange={(e) => setContato1(maskPhone(e.target.value))}
                placeholder="(62) 99999-9999"
                maxLength={15}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900"
              />
            </div>

            {/* 11. CONTATO(2) */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                CONTATO(2):
              </label>
              <input
                id="input-contato2"
                type="text"
                value={contato2}
                onChange={(e) => setContato2(maskPhone(e.target.value))}
                placeholder="(62) 3333-3333 ou recado"
                maxLength={15}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* GRUPO 2: DADOS DO IMÓVEL */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-t-4 border-t-emerald-600 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Dados do Imóvel</h2>
              <p className="text-xs text-slate-500">Localização e identificação do lote</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 12. LOTE */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                LOTE: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-lote"
                type="text"
                required
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Ex: Lote 05"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900 font-bold"
              />
            </div>

            {/* 13. QUADRA */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                QUADRA: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-quadra"
                type="text"
                required
                value={quadra}
                onChange={(e) => setQuadra(e.target.value)}
                placeholder="Ex: Quadra 03"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900 font-bold"
              />
            </div>

            {/* 14. EMPREENDIMENTO */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                EMPREENDIMENTO: <span className="text-rose-500">*</span>
              </label>
              <select
                id="input-empreendimento"
                value={selectedEmpreendimentoId}
                onChange={(e) => setSelectedEmpreendimentoId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-semibold text-slate-900 cursor-pointer"
              >
                {empreendimentos.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} ({emp.cidade}/{emp.uf})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* INFORMAÇÃO GEOGRÁFICA DO EMPREENDIMENTO SELECIONADO */}
          {currentEmpreendimento && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {currentEmpreendimento.enderecoCompleto || currentEmpreendimento.localizacao}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  {currentEmpreendimento.cidade} - {currentEmpreendimento.uf} • CEP: {currentEmpreendimento.cep || '74000-000'} • GPS: {currentEmpreendimento.latitude?.toFixed(4)}, {currentEmpreendimento.longitude?.toFixed(4)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenMap(currentEmpreendimento.id)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <Map className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ver Mapa & Lotes</span>
              </button>
            </div>
          )}
        </div>

        {/* GRUPO 3: CONDIÇÕES FINANCEIRAS */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-t-4 border-t-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Condições Financeiras</h2>
              <p className="text-xs text-slate-500">Valores, entrada e prazos de pagamento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* 15. VALOR TOTAL */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                VALOR TOTAL: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-valor-total"
                type="number"
                required
                value={valorTotal}
                onChange={(e) => setValorTotal(parseFloat(e.target.value) || 0)}
                placeholder="R$ 0,00"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono font-bold text-slate-900"
              />
              <span className="text-xs text-emerald-700 font-mono font-bold mt-1 block">
                {formatCurrency(valorTotal)}
              </span>
            </div>

            {/* 16. ENTRADA */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                ENTRADA: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-entrada"
                type="number"
                required
                value={entrada}
                onChange={(e) => setEntrada(parseFloat(e.target.value) || 0)}
                placeholder="R$ 0,00"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500 font-mono mt-1 block">
                {formatCurrency(entrada)}
              </span>
            </div>

            {/* 17. QUANTIDADE DE PARCELAS */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                QUANTIDADE DE PARCELAS: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-qtd-parcelas"
                type="number"
                min={1}
                max={360}
                required
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(parseInt(e.target.value) || 1)}
                placeholder="Ex: 120"
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500 font-mono mt-1 block">
                {quantidadeParcelas === 1 ? '1 parcela (À vista)' : `${quantidadeParcelas}x mensais`}
              </span>
            </div>

            {/* 18. DATA DE VENCIMENTO */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                DATA DE VENCIMENTO: <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-data-vencimento"
                type="date"
                required
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-mono text-slate-900"
              />
              <span className="text-xs text-slate-500 font-mono mt-1 block">
                Primeiro vencimento
              </span>
            </div>
          </div>

          {/* SIMULADOR EM TEMPO REAL */}
          <div className="bg-slate-50 rounded-xl p-4 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-500 block">Saldo a Financiar:</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(saldoFinanciar)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-500 block">Valor Estimado por Parcela:</span>
              <span className="text-base font-extrabold text-emerald-700">{formatCurrency(valorParcelaCalculado)}/mês</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-500 block">Comissão Corretor ({comissaoPercentual}%):</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(valorComissaoCalculado)}</span>
            </div>
          </div>
        </div>

        {/* GRUPO 4: DADOS DO VENDEDOR */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 border-t-4 border-t-emerald-600 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Vendedor / Corretor</h2>
              <p className="text-xs text-slate-500">Responsável pela intermediação da venda</p>
            </div>
          </div>

          <div className="max-w-md space-y-3">
            {/* 19. VENDEDOR */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                VENDEDOR / CORRETOR: <span className="text-rose-500">*</span>
              </label>
              <select
                id="input-vendedor"
                value={selectedCorretorId}
                onChange={(e) => setSelectedCorretorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-semibold text-slate-900 cursor-pointer"
              >
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (CRECI: {c.creci}) - {c.comissaoPadraoPercentual}%
                  </option>
                ))}
              </select>
            </div>

            {currentCorretor && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Telefone/WhatsApp:</span>
                  <span className="font-bold text-slate-900">{currentCorretor.telefone}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Chave PIX:</span>
                  <span className="font-bold text-emerald-700">{currentCorretor.chavePix || 'Não cadastrada'}</span>
                </div>
                {currentCorretor.banco && (
                  <div className="flex justify-between text-slate-700">
                    <span>Banco:</span>
                    <span className="text-slate-800">{currentCorretor.banco}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* GRUPO 5: OPÇÕES DE GERAÇÃO DE CONTRATO (INTELIGÊNCIA FINANCEIRA) */}
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h2 className="text-sm font-heading font-bold text-slate-800 uppercase tracking-wider">
                Geração de Contrato (Conforme Dados da Venda)
              </h2>
            </div>

            {quantidadeParcelas > 1 && saldoFinanciar > 0 ? (
              <span className="text-xs bg-blue-100 text-blue-900 font-bold px-3 py-1 rounded-full border border-blue-200 flex items-center space-x-1">
                <span>📊 Venda Parcelada ({quantidadeParcelas}x)</span>
              </span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                <span>💰 Venda À Vista (Sem parcelas)</span>
              </span>
            )}
          </div>

          {/* Card Condicional Inteligente */}
          {quantidadeParcelas > 1 && saldoFinanciar > 0 ? (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-950">
                    Venda com Parcelamento Ativo ({quantidadeParcelas}x de {formatCurrency(valorParcelaCalculado)})
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Esta venda possui parcelas configuradas. Você pode emitir o <strong>Contrato Parcelado</strong>, o <strong>Contrato À Vista</strong>, ou <strong>gerar ambos simultaneamente</strong> em Word (.docx) e PDF.
                  </p>
                </div>
              </div>

              {onOpenWordGenerator && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSave(false, false, true, 'parcelado')}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Gerar Contrato Parcelado (.docx / PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(false, false, true, 'a_vista')}
                    className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gerar Contrato À Vista (.docx / PDF)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-950">
                    Venda À Vista / Quitação Integral ({formatCurrency(valorTotal)})
                  </p>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Não há saldo a parcelar (apenas 1 parcela ou quitado). O contrato aplicável é exclusivamente o <strong>Contrato de Compra e Venda À Vista</strong>.
                  </p>
                </div>
              </div>

              {onOpenWordGenerator && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSave(false, false, true, 'a_vista')}
                    className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Gerar Contrato À Vista (.docx / PDF)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BARRA DE AÇÃO FIXA */}
        <div className="bg-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-emerald-500 shadow-lg sticky bottom-4 z-30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-slate-900">Pronto para Registrar</p>
              <p className="text-xs text-slate-500">
                {quantidadeParcelas > 1 && saldoFinanciar > 0 
                  ? `Venda parcelada (${quantidadeParcelas}x) • Contratos Parcelado e À Vista habilitados` 
                  : 'Venda à vista • Contrato à vista habilitado'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-save-proposal"
              onClick={() => handleSave(false, false)}
              className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex-1 sm:flex-none text-center cursor-pointer"
            >
              Salvar Proposta
            </button>

            {onOpenWordGenerator && (
              <button
                type="button"
                id="btn-save-and-word"
                onClick={() => handleSave(false, false, true)}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 flex-1 sm:flex-none cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>
                  {quantidadeParcelas > 1 && saldoFinanciar > 0 
                    ? 'Gerar Contrato (Opções)' 
                    : 'Gerar Contrato À Vista'}
                </span>
              </button>
            )}

            <button
              type="button"
              id="btn-save-and-sign"
              onClick={() => handleSave(true, true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 flex-1 sm:flex-none cursor-pointer border border-slate-800"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Assinar na Tela</span>
            </button>

            <button
              type="button"
              id="btn-save-and-contract"
              onClick={() => handleSave(true, false)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 flex-1 sm:flex-none cursor-pointer border border-emerald-600"
            >
              <FileText className="w-4 h-4" />
              <span>Gerar Contrato Padrão</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
