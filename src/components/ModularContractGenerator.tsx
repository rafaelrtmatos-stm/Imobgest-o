import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  CheckSquare, 
  Square, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  ShieldCheck, 
  PenTool, 
  FileCheck, 
  Send, 
  Clock, 
  ChevronRight, 
  RotateCcw, 
  Copy, 
  Trash2, 
  Edit3, 
  Plus, 
  Building2, 
  Check, 
  Search,
  Lock,
  Compass,
  FileCode2,
  ExternalLink,
  Users
} from 'lucide-react';
import { 
  ContratoModularFormData, 
  ModularBlocksConfig, 
  StatusContratoModular, 
  ContratoModularRecord 
} from '../types/modularContract';
import { AppUser, Cliente, Corretor, DocumentTemplate, Empreendimento, LoteData, SaleRecord } from '../types';
import { 
  calcularDataTermino, 
  calcularComissao, 
  generateModularDocxBlob, 
  generateModularContractHtml 
} from '../utils/modularDocxProcessor';
import { formatCurrency, formatDateBR, valorPorExtenso } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GenericDigitalContractInput } from '../utils/digitalSignatureService';

interface ModularContractGeneratorProps {
  currentUser: AppUser | null;
  wordTemplates: DocumentTemplate[];
  clientes: Cliente[];
  empreendimentos: Empreendimento[];
  corretores: Corretor[];
  sales: SaleRecord[];
  onOpenDigitalSignatureFlow?: (contratoData: GenericDigitalContractInput) => void;
  onNavigateToTemplates?: () => void;
}

const STORAGE_KEY_MODULAR_CONTRACTS = 'imobgestao_modular_contracts_v1';

const INITIAL_BLOCKS_CONFIG: ModularBlocksConfig = {
  contratante: true,
  conjuge: false,
  corretor: true,
  imovel: true,
  documentacaoImovel: true,
  precoCondicoes: true,
  exclusividade: true,
  autorizacaoVisitas: true,
  autorizacaoDivulgacao: true,
  autorizacaoPlaca: true,
  autorizacaoFotosVideos: true,
  autorizacaoPortaisRedes: true,
  comissao: true,
  parceriaCorretores: true,
  protecaoInteressados: true,
  prazo: true,
  rescisao: true,
  foro: true,
  assinaturas: true,
};

export const ModularContractGenerator: React.FC<ModularContractGeneratorProps> = ({
  currentUser,
  wordTemplates,
  clientes,
  empreendimentos,
  corretores,
  sales,
  onOpenDigitalSignatureFlow,
  onNavigateToTemplates,
}) => {
  // 1. Estados da visualização principal: 'editor' | 'historico' | 'modelos'
  const [activeMainView, setActiveMainView] = useState<'editor' | 'historico'>('editor');
  
  // Modo exclusivo para contrato de exclusividade: 'manual' | 'link'
  
  // 2. Modelo .docx selecionado para base
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default_modular');
  
  // 3. Histórico de Contratos Modulares Gerados
  const [savedContracts, setSavedContracts] = useState<ContratoModularRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODULAR_CONTRACTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Erro ao carregar contratos salvos:', e);
    }
    return [];
  });

  // 4. Data de hoje para inicialização
  const todayStr = new Date().toISOString().split('T')[0];
  const initialTerminoExclusividade = calcularDataTermino(todayStr, 90);

  // 5. Estado do formulário modular
  const [formData, setFormData] = useState<ContratoModularFormData>({
    tituloContrato: 'AUTORIZAÇÃO DE VENDA DE IMÓVEL COM EXCLUSIVIDADE',
    status: 'RASCUNHO',
    dataEmissao: todayStr,
    blocks: { ...INITIAL_BLOCKS_CONFIG },
    contratante: {
      nome: '',
      estadoCivil: 'Casado(a)',
      profissao: '',
      cpf: '',
      rg: '',
      endereco: '',
      telefone: '',
      email: '',
      nacionalidade: 'Brasileira',
    },
    conjuge: {
      nome: '',
      cpf: '',
      rg: '',
      profissao: '',
      regimeBens: 'Comunhão Parcial de Bens',
    },
    corretor: {
      nome: currentUser?.nome || 'Roberto Silva Albuquerque',
      cpfCnpj: '28.910.450/0001-90',
      creci: currentUser?.creci || 'CRECI-PA 4810-J',
      endereco: 'Av. Mendonça Furtado, nº 1.450, Centro, Santarém - PA',
      telefone: currentUser?.telefone || '(93) 3522-8800',
      email: currentUser?.email || 'contato@imobgestao.com.br',
    },
    imovel: {
      tipoImovel: 'Lote / Terreno Residencial Urbano',
      localizacao: 'Alameda Principal, Reserva Bosque dos Ipês',
      endereco: 'Alameda das Palmeiras',
      numero: 'Lote 04',
      complemento: 'Quadra 02',
      bairro: 'Reserva Bosque',
      cidade: 'Santarém',
      uf: 'PA',
      cep: '68005-100',
      areaM2: '360,00 m²',
      lote: '04',
      quadra: '02',
      empreendimento: 'Reserva Bosque dos Ipês',
    },
    documentacaoImovel: {
      documentoPropriedade: 'Escritura Pública Registrada / Matrícula Individualizada',
      matricula: 'R-04/182.490',
      inscricaoMunicipal: '01.02.034.0045-001',
      cartorio: '1º Ofício de Registro de Imóveis',
      outrosDados: 'Frente: 12,00m, Fundo: 30,00m, confrontando pelo lado direito com o Lote 05 e esquerdo com o Lote 03',
    },
    precoCondicoes: {
      precoVenda: 180000,
      condicoesPagamento: 'À Vista na assinatura ou Entrada de 20% com saldo financiado em até 120 meses',
      observacoesComerciais: 'Imóvel desimpedido, aceita proposta de parcelamento direto',
      valorEntrada: 36000,
      quantidadeParcelas: 60,
      valorParcela: 2400,
    },
    exclusividade: {
      dataInicio: todayStr,
      prazoDias: 90,
      dataTermino: initialTerminoExclusividade,
      tipoContratação: 'Intermediação e Venda com Exclusividade',
      precoAutorizadoVenda: 180000,
      percentualComissao: 6,
      valorComissao: 10800,
      condicoesPagamentoAutorizadas: 'À vista ou Financiamento Bancário / Parcelamento Direto',
      observacoesExclusividade: 'Durante a vigência da exclusividade, todo e qualquer contato comercial será direcionado ao corretor',
    },
    protecaoInteressados: {
      prazoProtecaoDias: 180,
      observacoes: 'A proteção abrange todos os clientes devidamente cadastrados na ficha de visita ou propostas formalizadas',
    },
    comissao: {
      percentual: 6,
      valorVenda: 180000,
      valorComissao: 10800,
      formaPagamentoComissao: 'No ato do recebimento do sinal da venda ou formalização da escritura pública',
    },
    prazo: {
      dataInicio: todayStr,
      quantidadeDias: 90,
      dataTermino: initialTerminoExclusividade,
    },
    rescisao: {
      multaRescisoriaPercentual: 50,
      avisoPrevioDias: 30,
      textoClausula: 'O presente contrato poderá ser rescindido por mútuo acordo ou por descumprimento de qualquer uma de suas cláusulas. Em caso de rescisão imotivada durante o período de exclusividade, será devida indenização de 50% da remuneração pactuada.',
    },
    foro: {
      comarca: 'Santarém',
      uf: 'PA',
    },
    assinaturas: {
      signatarios: {
        contratante: true,
        conjuge: false,
        corretor: true,
        testemunha1: true,
        testemunha2: true,
      },
      testemunha1: {
        nome: 'Lucas de Souza Ferreira',
        cpf: '345.678.901-22',
      },
      testemunha2: {
        nome: 'Patricia Martins Rocha',
        cpf: '678.901.234-55',
      },
    },
  });

  // 6. Estados auxiliares
  const [activeTabMobile, setActiveTabMobile] = useState<'config' | 'preview'>('config');
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchTermHistorico, setSearchTermHistorico] = useState('');
  const [filterStatusHistorico, setFilterStatusHistorico] = useState<string>('TODOS');
  
  // Ref para captura de PDF
  const previewRef = useRef<HTMLDivElement>(null);

  // Persiste contratos salvos no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODULAR_CONTRACTS, JSON.stringify(savedContracts));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  }, [savedContracts]);

  // Mensagem toast temporária
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Toggle de um bloco específico
  const handleToggleBlock = (blockKey: keyof ModularBlocksConfig) => {
    setFormData(prev => {
      const nextVal = !prev.blocks[blockKey];
      const newBlocks = { ...prev.blocks, [blockKey]: nextVal };

      // Se desmarcar conjuge, atualiza também a assinatura do conjuge
      const newAssinaturas = { ...prev.assinaturas };
      if (blockKey === 'conjuge') {
        newAssinaturas.signatarios.conjuge = nextVal;
      }

      return {
        ...prev,
        blocks: newBlocks,
        assinaturas: newAssinaturas,
      };
    });
  };

  // Atualiza campo com cálculo em tempo real
  const handleUpdateExclusividade = (field: keyof typeof formData.exclusividade, value: any) => {
    setFormData(prev => {
      const updated = { ...prev.exclusividade, [field]: value };

      // Recalcula Data de Término
      if (field === 'dataInicio' || field === 'prazoDias') {
        const dInicio = field === 'dataInicio' ? String(value) : prev.exclusividade.dataInicio;
        const pDias = field === 'prazoDias' ? Number(value) : prev.exclusividade.prazoDias;
        updated.dataTermino = calcularDataTermino(dInicio, pDias);
      }

      // Recalcula Comissão
      if (field === 'precoAutorizadoVenda' || field === 'percentualComissao') {
        const preco = field === 'precoAutorizadoVenda' ? Number(value) : prev.exclusividade.precoAutorizadoVenda;
        const pct = field === 'percentualComissao' ? Number(value) : prev.exclusividade.percentualComissao;
        updated.valorComissao = calcularComissao(preco, pct);
      }

      return { ...prev, exclusividade: updated };
    });
  };

  // Atualiza comissão independente com cálculo em tempo real
  const handleUpdateComissao = (field: keyof typeof formData.comissao, value: any) => {
    setFormData(prev => {
      const updated = { ...prev.comissao, [field]: value };
      if (field === 'valorVenda' || field === 'percentual') {
        const preco = field === 'valorVenda' ? Number(value) : prev.comissao.valorVenda;
        const pct = field === 'percentual' ? Number(value) : prev.comissao.percentual;
        updated.valorComissao = calcularComissao(preco, pct);
      }
      return { ...prev, comissao: updated };
    });
  };

  // Atualiza prazo do contrato com cálculo em tempo real
  const handleUpdatePrazo = (field: keyof typeof formData.prazo, value: any) => {
    setFormData(prev => {
      const updated = { ...prev.prazo, [field]: value };
      if (field === 'dataInicio' || field === 'quantidadeDias') {
        const dInicio = field === 'dataInicio' ? String(value) : prev.prazo.dataInicio;
        const qDias = field === 'quantidadeDias' ? Number(value) : prev.prazo.quantidadeDias;
        updated.dataTermino = calcularDataTermino(dInicio, qDias);
      }
      return { ...prev, prazo: updated };
    });
  };

  // Preenche dados do corretor com o usuário autenticado ou corretor da lista
  const handleFillCorretorData = (corretorSelecionado?: Corretor) => {
    if (corretorSelecionado) {
      setFormData(prev => ({
        ...prev,
        corretor: {
          nome: corretorSelecionado.nome,
          cpfCnpj: '28.910.450/0001-90',
          creci: corretorSelecionado.creci,
          endereco: 'Av. Mendonça Furtado, nº 1.450, Centro, Santarém - PA',
          telefone: corretorSelecionado.telefone,
          email: corretorSelecionado.email,
        }
      }));
      showToast(`Dados do corretor ${corretorSelecionado.nome} carregados com sucesso!`);
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        corretor: {
          nome: currentUser.nome,
          cpfCnpj: '28.910.450/0001-90',
          creci: currentUser.creci || 'CRECI-PA 4810-J',
          endereco: 'Av. Mendonça Furtado, nº 1.450, Centro, Santarém - PA',
          telefone: currentUser.telefone || '(93) 3522-8800',
          email: currentUser.email,
        }
      }));
      showToast('Dados do seu perfil de usuário foram aplicados!');
    }
  };

  // Importa dados de um Cliente cadastrado
  const handleImportCliente = (cli: Cliente) => {
    setFormData(prev => {
      const hasConjuge = !!cli.nomeConjuge;
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          conjuge: hasConjuge ? true : prev.blocks.conjuge,
        },
        contratante: {
          nome: cli.nome,
          estadoCivil: cli.estadoCivil,
          profissao: cli.profissao || '',
          cpf: cli.cpf,
          rg: cli.rg || '',
          endereco: `${cli.endereco || ''}, nº ${cli.numero || 'S/N'}${cli.bairro ? ', Bairro ' + cli.bairro : ''}, ${cli.cidade || ''} - ${cli.uf || cli.estado || ''}`,
          telefone: cli.telefone || cli.contato1 || '',
          email: cli.email || '',
          nacionalidade: cli.nacionalidade || 'Brasileira',
        },
        conjuge: {
          nome: cli.nomeConjuge || '',
          cpf: cli.cpfConjuge || '',
          rg: cli.rgConjuge || '',
          profissao: cli.profissaoConjuge || '',
          regimeBens: cli.regimeBens || 'Comunhão Parcial de Bens',
        },
        assinaturas: {
          ...prev.assinaturas,
          signatarios: {
            ...prev.assinaturas.signatarios,
            conjuge: hasConjuge,
          }
        }
      };
    });
    showToast(`Dados de ${cli.nome} importados para o contrato!`);
  };

  // Importa dados de um Lote cadastrado
  const handleImportLote = (emp: Empreendimento, lote: LoteData) => {
    setFormData(prev => ({
      ...prev,
      imovel: {
        tipoImovel: 'Lote Residencial Urbano',
        localizacao: `${emp.nome}, Quadra ${lote.quadra}, Lote ${lote.numero}`,
        endereco: emp.localizacao || emp.bairro || 'Alameda Principal',
        numero: `Lote ${lote.numero}`,
        complemento: `Quadra ${lote.quadra}`,
        bairro: emp.bairro || 'Centro',
        cidade: emp.cidade,
        uf: emp.uf || emp.estado || 'PA',
        cep: emp.cep || '68000-000',
        areaM2: `${lote.area} m²`,
        lote: lote.numero,
        quadra: lote.quadra,
        empreendimento: emp.nome,
      },
      documentacaoImovel: {
        documentoPropriedade: `Matrícula Geral ${emp.matriculaGeral}`,
        matricula: emp.matriculaGeral || 'R-04/182.490',
        inscricaoMunicipal: '01.02.034.0045-001',
        cartorio: emp.cartorioRegistro || '1º Ofício de Registro de Imóveis',
        outrosDados: `Frente: ${lote.frente || 12}m x Fundo: ${lote.fundo || 30}m`,
      },
      precoCondicoes: {
        ...prev.precoCondicoes,
        precoVenda: lote.valor || 150000,
      },
      exclusividade: {
        ...prev.exclusividade,
        precoAutorizadoVenda: lote.valor || 150000,
        valorComissao: calcularComissao(lote.valor || 150000, prev.exclusividade.percentualComissao),
      },
      comissao: {
        ...prev.comissao,
        valorVenda: lote.valor || 150000,
        valorComissao: calcularComissao(lote.valor || 150000, prev.comissao.percentual),
      }
    }));
    showToast(`Dados do Lote ${lote.numero} (Quadra ${lote.quadra}) importados!`);
  };

  // GERAÇÃO DO ARQUIVO DOCX
  const handleGenerateDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      const selectedTemplate = wordTemplates.find(t => t.id === selectedTemplateId);
      const docxBlob = await generateModularDocxBlob(selectedTemplate?.fileBase64, formData);

      const fileName = `Contrato_Modular_${formData.contratante.nome ? formData.contratante.nome.replace(/\s+/g, '_') : 'Imovel'}_${Date.now()}.docx`;
      
      // Trigger download
      const url = window.URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Salva no histórico com status GERADO
      handleSaveContractRecord('GERADO');
      showToast('Documento Word (.DOCX) gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err);
      alert('Ocorreu um erro ao gerar o arquivo Word (.docx). Verifique o modelo.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // GERAÇÃO DO ARQUIVO PDF
  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      if (!previewRef.current) return;

      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 largura em mm
      const pageHeight = 297; // A4 altura em mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const fileName = `Contrato_Modular_${formData.contratante.nome ? formData.contratante.nome.replace(/\s+/g, '_') : 'Imovel'}_${Date.now()}.pdf`;
      pdf.save(fileName);

      handleSaveContractRecord('GERADO');
      showToast('Contrato em PDF gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ENVIAR PARA ASSINATURA DIGITAL
  // Usa o MESMO fluxo de link + CPF/CNPJ + código de 6 dígitos utilizado pelos
  // demais modelos de contrato (Venda à Vista / Venda Parcelada), conforme regra
  // única de assinatura digital do sistema.
  const handleSendToDigitalSignature = () => {
    const record = handleSaveContractRecord('AGUARDANDO ASSINATURAS');
    if (onOpenDigitalSignatureFlow) {
      onOpenDigitalSignatureFlow({
        contractId: record.codigoContrato,
        titulo: formData.tituloContrato,
        tipoContrato: 'Exclusividade',
        documentoHtml: generateModularContractHtml(formData),
        partes: [
          {
            role: 'corretor',
            label: 'CONTRATADA (Corretor/Imobiliária)',
            nome: formData.corretor.nome || 'Corretor',
            cpf: formData.corretor.cpfCnpj || '',
            email: formData.corretor.email || '',
            telefone: formData.corretor.telefone || '',
          },
          {
            role: 'parte_1',
            label: 'CONTRATANTE',
            nome: formData.contratante.nome || 'Contratante',
            cpf: formData.contratante.cpf || '',
            email: formData.contratante.email || '',
            telefone: formData.contratante.telefone || '',
          },
        ],
      });
      showToast('Contrato enviado para o fluxo de Assinatura Digital!');
    } else {
      showToast('Status atualizado para AGUARDANDO ASSINATURAS!');
    }
  };

  // SALVA OU ATUALIZA REGISTRO NO HISTÓRICO
  const handleSaveContractRecord = (newStatus?: StatusContratoModular): ContratoModularRecord => {
    const status = newStatus || formData.status || 'RASCUNHO';
    const contractCode = formData.id 
      ? (savedContracts.find(c => c.id === formData.id)?.codigoContrato || `MOD-${Date.now().toString().slice(-5)}`)
      : `MOD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const record: ContratoModularRecord = {
      ...formData,
      id: formData.id || `mod_contract_${Date.now()}`,
      codigoContrato: contractCode,
      status: status,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedContracts(prev => {
      const idx = prev.findIndex(c => c.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });

    setFormData(prev => ({ ...prev, id: record.id, status }));
    return record;
  };

  // Carrega contrato do histórico para edição
  const handleLoadContract = (record: ContratoModularRecord) => {
    setFormData(record);
    setActiveMainView('editor');
    showToast(`Contrato ${record.codigoContrato} carregado no editor!`);
  };

  // Exclui contrato do histórico
  const handleDeleteContract = (id: string) => {
    if (confirm('Tem certeza de que deseja remover este contrato do histórico?')) {
      setSavedContracts(prev => prev.filter(c => c.id !== id));
      showToast('Contrato removido com sucesso!');
    }
  };

  // Inicia um novo contrato limpo
  const handleResetToNew = () => {
    setFormData({
      tituloContrato: 'AUTORIZAÇÃO DE VENDA DE IMÓVEL COM EXCLUSIVIDADE',
      status: 'RASCUNHO',
      dataEmissao: todayStr,
      blocks: { ...INITIAL_BLOCKS_CONFIG },
      contratante: {
        nome: '',
        estadoCivil: 'Solteiro(a)',
        profissao: '',
        cpf: '',
        rg: '',
        endereco: '',
        telefone: '',
        email: '',
        nacionalidade: 'Brasileira',
      },
      conjuge: {
        nome: '',
        cpf: '',
        rg: '',
        profissao: '',
        regimeBens: 'Comunhão Parcial de Bens',
      },
      corretor: {
        nome: currentUser?.nome || 'Roberto Silva Albuquerque',
        cpfCnpj: '28.910.450/0001-90',
        creci: currentUser?.creci || 'CRECI-PA 4810-J',
        endereco: 'Av. Mendonça Furtado, nº 1.450, Centro, Santarém - PA',
        telefone: currentUser?.telefone || '(93) 3522-8800',
        email: currentUser?.email || 'contato@imobgestao.com.br',
      },
      imovel: {
        tipoImovel: 'Lote / Terreno Residencial Urbano',
        localizacao: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: 'Santarém',
        uf: 'PA',
        cep: '',
        areaM2: '',
        lote: '',
        quadra: '',
        empreendimento: '',
      },
      documentacaoImovel: {
        documentoPropriedade: 'Matrícula Geral',
        matricula: '',
        inscricaoMunicipal: '',
        cartorio: '1º Ofício de Registro de Imóveis',
        outrosDados: '',
      },
      precoCondicoes: {
        precoVenda: 0,
        condicoesPagamento: 'À Vista',
        observacoesComerciais: '',
      },
      exclusividade: {
        dataInicio: todayStr,
        prazoDias: 90,
        dataTermino: initialTerminoExclusividade,
        tipoContratação: 'Intermediação e Venda com Exclusividade',
        precoAutorizadoVenda: 0,
        percentualComissao: 6,
        valorComissao: 0,
        condicoesPagamentoAutorizadas: '',
        observacoesExclusividade: '',
      },
      protecaoInteressados: {
        prazoProtecaoDias: 180,
        observacoes: '',
      },
      comissao: {
        percentual: 6,
        valorVenda: 0,
        valorComissao: 0,
        formaPagamentoComissao: 'No ato do recebimento do sinal da venda',
      },
      prazo: {
        dataInicio: todayStr,
        quantidadeDias: 90,
        dataTermino: initialTerminoExclusividade,
      },
      rescisao: {
        multaRescisoriaPercentual: 50,
        avisoPrevioDias: 30,
        textoClausula: '',
      },
      foro: {
        comarca: 'Santarém',
        uf: 'PA',
      },
      assinaturas: {
        signatarios: {
          contratante: true,
          conjuge: false,
          corretor: true,
          testemunha1: true,
          testemunha2: true,
        },
        testemunha1: { nome: '', cpf: '' },
        testemunha2: { nome: '', cpf: '' },
      },
    });
    showToast('Novo contrato em branco iniciado!');
  };

  // Filtro do histórico
  const filteredContracts = savedContracts.filter(c => {
    const matchesSearch = 
      (c.codigoContrato && c.codigoContrato.toLowerCase().includes(searchTermHistorico.toLowerCase())) ||
      (c.contratante.nome && c.contratante.nome.toLowerCase().includes(searchTermHistorico.toLowerCase())) ||
      (c.tituloContrato && c.tituloContrato.toLowerCase().includes(searchTermHistorico.toLowerCase())) ||
      (c.imovel.empreendimento && c.imovel.empreendimento.toLowerCase().includes(searchTermHistorico.toLowerCase()));

    const matchesStatus = filterStatusHistorico === 'TODOS' || c.status === filterStatusHistorico;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: StatusContratoModular) => {
    switch (status) {
      case 'ASSINADO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Assinado</span>;
      case 'PARCIALMENTE ASSINADO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300"><Clock className="w-3 h-3 mr-1" /> Parcialmente Assinado</span>;
      case 'AGUARDANDO ASSINATURAS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"><Clock className="w-3 h-3 mr-1" /> Aguardando Assinaturas</span>;
      case 'ENVIADO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300"><Send className="w-3 h-3 mr-1" /> Enviado</span>;
      case 'GERADO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300"><FileCheck className="w-3 h-3 mr-1" /> Gerado</span>;
      case 'CANCELADO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300"><AlertCircle className="w-3 h-3 mr-1" /> Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300"><Edit3 className="w-3 h-3 mr-1" /> Rascunho</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-zinc-100 border border-emerald-500/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 border border-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
                  Gerador de Contratos Modulares
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                  WORD .DOCX OFICIAL
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Selecione apenas os blocos desejados, preencha os dados e gere o contrato instantaneamente em <strong>DOCX</strong>, <strong>PDF</strong> ou envie para <strong>Assinatura Digital</strong> sem alterar a formatação e identidade visual do modelo original.
              </p>
            </div>
          </div>

          {/* Abas e Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveMainView('editor')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMainView === 'editor' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editor Modular
              </button>
              <button
                type="button"
                onClick={() => setActiveMainView('historico')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeMainView === 'historico' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Histórico & Status</span>
                {savedContracts.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                    {savedContracts.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToNew}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer flex items-center space-x-1.5"
              title="Iniciar novo contrato"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Barra de Status e Modelo Base */}
        {activeMainView === 'editor' && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                {getStatusBadge(formData.status)}
              </div>
              <div className="text-slate-300 hidden sm:inline">|</div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo Base Word:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="default_modular">Modelo Oficial: Autorização com Exclusividade (DOCX)</option>
                  {wordTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} ({t.fileName})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSaveContractRecord('RASCUNHO')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Salvar Rascunho</span>
              </button>

              {onNavigateToTemplates && (
                <button
                  type="button"
                  onClick={onNavigateToTemplates}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Gerenciar Modelos .docx</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: EDITOR MODULAR */}
      {activeMainView === 'editor' && (
        <div className="space-y-6">
          {/* MODULAR: EDITOR COMPLETO (PREENCHIMENTO MANUAL) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: SELETOR DE BLOCOS & FORMULÁRIOS (7 colunas) */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* 1. SELEÇÃO DAS PARTES DO CONTRATO (CAIXAS DE SELEÇÃO) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                    <span>1. Seleção das Partes do Contrato</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marque as caixas para incluir os blocos. Blocos desmarcados não aparecem no contrato nem exigem campos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allTrue = Object.values(formData.blocks).every(v => v);
                    const newBlocks: any = {};
                    Object.keys(formData.blocks).forEach(k => {
                      newBlocks[k] = !allTrue;
                    });
                    setFormData(prev => ({ ...prev, blocks: newBlocks }));
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                >
                  {Object.values(formData.blocks).every(v => v) ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              {/* Grid de Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { key: 'contratante' as const, label: 'Dados do contratante', icon: User },
                  { key: 'conjuge' as const, label: 'Dados do cônjuge', icon: Users },
                  { key: 'corretor' as const, label: 'Dados do corretor/contratado', icon: Building2 },
                  { key: 'imovel' as const, label: 'Dados do imóvel', icon: MapPin },
                  { key: 'documentacaoImovel' as const, label: 'Documentação do imóvel', icon: FileCheck },
                  { key: 'precoCondicoes' as const, label: 'Preço e condições de pagamento', icon: DollarSign },
                  { key: 'exclusividade' as const, label: 'Cláusula de exclusividade', icon: ShieldCheck, highlight: true },
                  { key: 'autorizacaoVisitas' as const, label: 'Autorização para visitas', icon: Eye },
                  { key: 'autorizacaoDivulgacao' as const, label: 'Autorização para divulgação', icon: Share2 },
                  { key: 'comissao' as const, label: 'Comissão de corretagem', icon: DollarSign },
                  { key: 'parceriaCorretores' as const, label: 'Parceria com outros corretores', icon: Users },
                  { key: 'protecaoInteressados' as const, label: 'Proteção de interessados', icon: Lock },
                  { key: 'prazo' as const, label: 'Prazo do contrato', icon: Calendar },
                  { key: 'rescisao' as const, label: 'Rescisão', icon: AlertCircle },
                  { key: 'foro' as const, label: 'Foro', icon: Compass },
                  { key: 'assinaturas' as const, label: 'Assinaturas', icon: PenTool },
                ].map(({ key, label, icon: Icon, highlight }) => {
                  const isChecked = formData.blocks[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleBlock(key)}
                      className={`flex items-center space-x-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isChecked 
                          ? highlight 
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-bold'
                          : 'bg-slate-50/60 border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs leading-tight select-none">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTÕES DE ATALHO PARA IMPORTAR DADOS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Preenchimento Rápido:</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Auto-preencher corretor com perfil */}
                <button
                  type="button"
                  onClick={() => handleFillCorretorData()}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Usar Meus Dados de Corretor</span>
                </button>

                {/* Importar de Cliente */}
                {clientes.length > 0 && (
                  <select
                    onChange={(e) => {
                      const c = clientes.find(cli => cli.id === e.target.value);
                      if (c) handleImportCliente(c);
                    }}
                    defaultValue=""
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 cursor-pointer focus:outline-hidden"
                  >
                    <option value="" disabled>Importar Cliente Cadastrado...</option>
                    {clientes.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.nome} ({cli.cpf})</option>
                    ))}
                  </select>
                )}

                {/* Importar de Empreendimento / Lote */}
                {empreendimentos.length > 0 && (
                  <select
                    onChange={(e) => {
                      const [empId, quadraId, loteId] = e.target.value.split(':');
                      const emp = empreendimentos.find(em => em.id === empId);
                      if (emp) {
                        const quadra = emp.quadras?.find(q => q.id === quadraId);
                        const lote = quadra?.lotes?.find(l => l.id === loteId);
                        if (lote) handleImportLote(emp, lote);
                      }
                    }}
                    defaultValue=""
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 cursor-pointer focus:outline-hidden"
                  >
                    <option value="" disabled>Importar Lote / Imóvel...</option>
                    {empreendimentos.map(emp => (
                      <optgroup key={emp.id} label={emp.nome}>
                        {emp.quadras?.flatMap(q => q.lotes?.map(l => (
                          <option key={l.id} value={`${emp.id}:${q.id}:${l.id}`}>
                            Quadra {q.numero}, Lote {l.numero} ({l.area}m² - {formatCurrency(l.valor)})
                          </option>
                        )))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* FORMULÁRIOS CONDICIONAIS - APENAS BLOCOS ATIVOS */}
            <div className="space-y-4">

              {/* TÍTULO DO CONTRATO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Título do Contrato / Documento
                </label>
                <input
                  type="text"
                  value={formData.tituloContrato}
                  onChange={(e) => setFormData(prev => ({ ...prev, tituloContrato: e.target.value }))}
                  placeholder="Ex: AUTORIZAÇÃO DE VENDA DE IMÓVEL COM EXCLUSIVIDADE"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* 2. DADOS DO CONTRATANTE */}
              {formData.blocks.contratante && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-emerald-700">
                    <User className="w-4 h-4" />
                    <span>2. Dados do Contratante</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.contratante.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, nome: e.target.value } }))}
                        placeholder="Nome do cliente proprietário ou adquirente"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.contratante.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, cpf: e.target.value } }))}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Identidade / RG</label>
                      <input
                        type="text"
                        value={formData.contratante.rg}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, rg: e.target.value } }))}
                        placeholder="Número / Órgão Expedidor"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Estado Civil</label>
                      <select
                        value={formData.contratante.estadoCivil}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, estadoCivil: e.target.value as any } }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                        <option value="Separado(a)">Separado(a)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Profissão</label>
                      <input
                        type="text"
                        value={formData.contratante.profissao}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, profissao: e.target.value } }))}
                        placeholder="Ex: Engenheiro, Empresário"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Residencial Completo</label>
                      <input
                        type="text"
                        value={formData.contratante.endereco}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, endereco: e.target.value } }))}
                        placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={formData.contratante.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, telefone: e.target.value } }))}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={formData.contratante.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, contratante: { ...prev.contratante, email: e.target.value } }))}
                        placeholder="email@exemplo.com"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2.1 DADOS DO CÔNJUGE (SE MARCADO) */}
              {formData.blocks.conjuge && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-teal-700">
                    <Users className="w-4 h-4" />
                    <span>Dados do Cônjuge</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Cônjuge</label>
                      <input
                        type="text"
                        value={formData.conjuge.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, conjuge: { ...prev.conjuge, nome: e.target.value } }))}
                        placeholder="Nome completo do(a) esposo(a)"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CPF do Cônjuge</label>
                      <input
                        type="text"
                        value={formData.conjuge.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, conjuge: { ...prev.conjuge, cpf: e.target.value } }))}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Identidade / RG do Cônjuge</label>
                      <input
                        type="text"
                        value={formData.conjuge.rg}
                        onChange={(e) => setFormData(prev => ({ ...prev, conjuge: { ...prev.conjuge, rg: e.target.value } }))}
                        placeholder="Número / Órgão"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Profissão do Cônjuge</label>
                      <input
                        type="text"
                        value={formData.conjuge.profissao}
                        onChange={(e) => setFormData(prev => ({ ...prev, conjuge: { ...prev.conjuge, profissao: e.target.value } }))}
                        placeholder="Profissão"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Regime de Bens</label>
                      <select
                        value={formData.conjuge.regimeBens}
                        onChange={(e) => setFormData(prev => ({ ...prev, conjuge: { ...prev.conjuge, regimeBens: e.target.value } }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option>
                        <option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option>
                        <option value="Separação Total de Bens">Separação Total de Bens</option>
                        <option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. DADOS DO CORRETOR / CONTRATADO */}
              {formData.blocks.corretor && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 text-indigo-700">
                      <Building2 className="w-4 h-4" />
                      <span>3. Dados do Corretor / Contratado</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">Auto-preenchimento habilitado</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Corretor / Empresa</label>
                      <input
                        type="text"
                        value={formData.corretor.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, corretor: { ...prev.corretor, nome: e.target.value } }))}
                        placeholder="Nome completo ou Razão Social"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CRECI</label>
                      <input
                        type="text"
                        value={formData.corretor.creci}
                        onChange={(e) => setFormData(prev => ({ ...prev, corretor: { ...prev.corretor, creci: e.target.value } }))}
                        placeholder="CRECI-PA 0000"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CPF / CNPJ</label>
                      <input
                        type="text"
                        value={formData.corretor.cpfCnpj}
                        onChange={(e) => setFormData(prev => ({ ...prev, corretor: { ...prev.corretor, cpfCnpj: e.target.value } }))}
                        placeholder="00.000.000/0000-00"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telefone de Contato</label>
                      <input
                        type="text"
                        value={formData.corretor.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, corretor: { ...prev.corretor, telefone: e.target.value } }))}
                        placeholder="(00) 0000-0000"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Comercial</label>
                      <input
                        type="text"
                        value={formData.corretor.endereco}
                        onChange={(e) => setFormData(prev => ({ ...prev, corretor: { ...prev.corretor, endereco: e.target.value } }))}
                        placeholder="Av., Número, Bairro, Cidade - UF"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DADOS DO IMÓVEL */}
              {formData.blocks.imovel && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-blue-700">
                    <MapPin className="w-4 h-4" />
                    <span>4. Dados do Imóvel</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Imóvel</label>
                      <input
                        type="text"
                        value={formData.imovel.tipoImovel}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, tipoImovel: e.target.value } }))}
                        placeholder="Ex: Terreno Urbano, Lote Residencial, Casa em Condomínio"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Logradouro / Endereço</label>
                      <input
                        type="text"
                        value={formData.imovel.endereco}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, endereco: e.target.value } }))}
                        placeholder="Nome da Rua, Avenida ou Alameda"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Número / Lote</label>
                      <input
                        type="text"
                        value={formData.imovel.numero}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, numero: e.target.value, lote: e.target.value } }))}
                        placeholder="Ex: Lote 12 ou Nº 145"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Complemento / Quadra</label>
                      <input
                        type="text"
                        value={formData.imovel.complemento}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, complemento: e.target.value, quadra: e.target.value } }))}
                        placeholder="Ex: Quadra 04"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.imovel.bairro}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, bairro: e.target.value } }))}
                        placeholder="Bairro"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.imovel.cidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, cidade: e.target.value } }))}
                        placeholder="Cidade"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                      <input
                        type="text"
                        value={formData.imovel.uf}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, uf: e.target.value } }))}
                        placeholder="PA"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.imovel.cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, cep: e.target.value } }))}
                        placeholder="00000-000"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Área Total</label>
                      <input
                        type="text"
                        value={formData.imovel.areaM2}
                        onChange={(e) => setFormData(prev => ({ ...prev, imovel: { ...prev.imovel, areaM2: e.target.value } }))}
                        placeholder="Ex: 360,00 m²"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. DOCUMENTAÇÃO DO IMÓVEL */}
              {formData.blocks.documentacaoImovel && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-cyan-700">
                    <FileCheck className="w-4 h-4" />
                    <span>5. Documentação do Imóvel</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Documento de Propriedade</label>
                      <input
                        type="text"
                        value={formData.documentacaoImovel.documentoPropriedade}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentacaoImovel: { ...prev.documentacaoImovel, documentoPropriedade: e.target.value } }))}
                        placeholder="Ex: Escritura Pública / Matrícula Geral"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Matrícula</label>
                      <input
                        type="text"
                        value={formData.documentacaoImovel.matricula}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentacaoImovel: { ...prev.documentacaoImovel, matricula: e.target.value } }))}
                        placeholder="Ex: R-04/182.490"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Inscrição Municipal / Prefeitura</label>
                      <input
                        type="text"
                        value={formData.documentacaoImovel.inscricaoMunicipal}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentacaoImovel: { ...prev.documentacaoImovel, inscricaoMunicipal: e.target.value } }))}
                        placeholder="IPTU / Inscrição Municipal"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cartório de Registro</label>
                      <input
                        type="text"
                        value={formData.documentacaoImovel.cartorio}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentacaoImovel: { ...prev.documentacaoImovel, cartorio: e.target.value } }))}
                        placeholder="1º Ofício de Registro de Imóveis"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Outros Dados / Confrontações</label>
                      <textarea
                        rows={2}
                        value={formData.documentacaoImovel.outrosDados}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentacaoImovel: { ...prev.documentacaoImovel, outrosDados: e.target.value } }))}
                        placeholder="Dimensões, confrontações e observações técnicas"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. PREÇO E CONDIÇÕES DE PAGAMENTO */}
              {formData.blocks.precoCondicoes && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-emerald-700">
                    <DollarSign className="w-4 h-4" />
                    <span>6. Preço e Condições</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preço de Venda (R$)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">R$</span>
                        <input
                          type="number"
                          value={formData.precoCondicoes.precoVenda || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              precoCondicoes: { ...prev.precoCondicoes, precoVenda: val },
                              exclusividade: {
                                ...prev.exclusividade,
                                precoAutorizadoVenda: val,
                                valorComissao: calcularComissao(val, prev.exclusividade.percentualComissao),
                              },
                              comissao: {
                                ...prev.comissao,
                                valorVenda: val,
                                valorComissao: calcularComissao(val, prev.comissao.percentual),
                              }
                            }));
                          }}
                          placeholder="0,00"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {formatCurrency(formData.precoCondicoes.precoVenda)} ({valorPorExtenso(formData.precoCondicoes.precoVenda)})
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Condições de Pagamento</label>
                      <input
                        type="text"
                        value={formData.precoCondicoes.condicoesPagamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, precoCondicoes: { ...prev.precoCondicoes, condicoesPagamento: e.target.value } }))}
                        placeholder="Ex: À Vista ou Entrada de R$ 30.000 + Parcelas"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Observações Comerciais</label>
                      <input
                        type="text"
                        value={formData.precoCondicoes.observacoesComerciais}
                        onChange={(e) => setFormData(prev => ({ ...prev, precoCondicoes: { ...prev.precoCondicoes, observacoesComerciais: e.target.value } }))}
                        placeholder="Condições especiais, aceita permuta, etc."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 7. MÓDULO DE EXCLUSIVIDADE (COM CÁLCULOS AUTOMÁTICOS) */}
              {formData.blocks.exclusividade && (
                <div className="bg-emerald-50/40 border-2 border-emerald-300 rounded-3xl p-6 shadow-xs animate-in fade-in space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                    <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>7. Módulo de Exclusividade & Comissão Automática</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase">
                      Cálculos em Tempo Real
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Data de Início da Exclusividade</label>
                      <input
                        type="date"
                        value={formData.exclusividade.dataInicio}
                        onChange={(e) => handleUpdateExclusividade('dataInicio', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Prazo em Dias</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.exclusividade.prazoDias || ''}
                        onChange={(e) => handleUpdateExclusividade('prazoDias', parseInt(e.target.value) || 0)}
                        placeholder="Ex: 90"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Data de Término <span className="text-[10px] text-emerald-600 font-bold">(Automática)</span>
                      </label>
                      <input
                        type="date"
                        readOnly
                        value={formData.exclusividade.dataTermino}
                        className="w-full px-3 py-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 focus:outline-hidden cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Preço Autorizado de Venda</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">R$</span>
                        <input
                          type="number"
                          value={formData.exclusividade.precoAutorizadoVenda || ''}
                          onChange={(e) => handleUpdateExclusividade('precoAutorizadoVenda', parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Percentual de Comissão (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={formData.exclusividade.percentualComissao || ''}
                          onChange={(e) => handleUpdateExclusividade('percentualComissao', parseFloat(e.target.value) || 0)}
                          className="w-full pr-8 pl-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Valor da Comissão <span className="text-[10px] text-emerald-600 font-bold">(Preço × %)</span>
                      </label>
                      <div className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-extrabold flex items-center justify-between shadow-xs">
                        <span>{formatCurrency(formData.exclusividade.valorComissao)}</span>
                        <span className="text-[11px] opacity-80">{formData.exclusividade.percentualComissao}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-emerald-900 mb-1">Observações da Exclusividade</label>
                    <input
                      type="text"
                      value={formData.exclusividade.observacoesExclusividade}
                      onChange={(e) => setFormData(prev => ({ ...prev, exclusividade: { ...prev.exclusividade, observacoesExclusividade: e.target.value } }))}
                      placeholder="Direito de preferência, placas, autorização de anúncios"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* 8. AUTORIZAÇÕES INDEPENDENTES */}
              {(formData.blocks.autorizacaoVisitas || formData.blocks.autorizacaoDivulgacao || formData.blocks.parceriaCorretores) && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 text-indigo-700">
                    <Share2 className="w-4 h-4" />
                    <span>8. Autorizações e Divulgação</span>
                  </h3>

                  <div className="space-y-2.5">
                    {formData.blocks.autorizacaoVisitas && (
                      <label className="flex items-center space-x-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.blocks.autorizacaoVisitas}
                          onChange={() => handleToggleBlock('autorizacaoVisitas')}
                          className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Autorizar Visitas</span>
                          <span className="text-[11px] text-slate-500">Permite realizar visitas agendadas com potenciais compradores</span>
                        </div>
                      </label>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <label className={`flex items-center space-x-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                        formData.blocks.autorizacaoPlaca ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.blocks.autorizacaoPlaca}
                          onChange={() => handleToggleBlock('autorizacaoPlaca')}
                          className="w-4 h-4 text-emerald-600 rounded-md"
                        />
                        <span className="text-xs">Autorizar Placa / Faixa</span>
                      </label>

                      <label className={`flex items-center space-x-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                        formData.blocks.autorizacaoFotosVideos ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.blocks.autorizacaoFotosVideos}
                          onChange={() => handleToggleBlock('autorizacaoFotosVideos')}
                          className="w-4 h-4 text-emerald-600 rounded-md"
                        />
                        <span className="text-xs">Fotos e Vídeos</span>
                      </label>

                      <label className={`flex items-center space-x-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                        formData.blocks.autorizacaoPortaisRedes ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.blocks.autorizacaoPortaisRedes}
                          onChange={() => handleToggleBlock('autorizacaoPortaisRedes')}
                          className="w-4 h-4 text-emerald-600 rounded-md"
                        />
                        <span className="text-xs">Portais & Redes Sociais</span>
                      </label>
                    </div>

                    {formData.blocks.parceriaCorretores && (
                      <label className="flex items-center space-x-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition-colors mt-2">
                        <input
                          type="checkbox"
                          checked={formData.blocks.parceriaCorretores}
                          onChange={() => handleToggleBlock('parceriaCorretores')}
                          className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Permitir Parceria com Outros Corretores / Imobiliárias</span>
                          <span className="text-[11px] text-slate-500">Autoriza co-corretagem sem acréscimo no percentual total de comissão</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* 9. PROTEÇÃO DOS INTERESSADOS APRESENTADOS */}
              {formData.blocks.protecaoInteressados && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-amber-700">
                    <Lock className="w-4 h-4" />
                    <span>9. Proteção dos Interessados Apresentados</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prazo de Proteção (Dias)</label>
                      <input
                        type="number"
                        value={formData.protecaoInteressados.prazoProtecaoDias || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, protecaoInteressados: { ...prev.protecaoInteressados, prazoProtecaoDias: parseInt(e.target.value) || 0 } }))}
                        placeholder="Ex: 180"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Observações de Proteção</label>
                      <input
                        type="text"
                        value={formData.protecaoInteressados.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, protecaoInteressados: { ...prev.protecaoInteressados, observacoes: e.target.value } }))}
                        placeholder="Ficha de visita e cadastro prévio obrigatório"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 10. COMISSÃO DE CORRETAGEM INDEPENDENTE */}
              {formData.blocks.comissao && !formData.blocks.exclusividade && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-emerald-700">
                    <DollarSign className="w-4 h-4" />
                    <span>10. Comissão de Corretagem</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Percentual (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.comissao.percentual || ''}
                        onChange={(e) => handleUpdateComissao('percentual', parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Valor Calculado</label>
                      <div className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-sm font-bold">
                        {formatCurrency(formData.comissao.valorComissao)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                      <input
                        type="text"
                        value={formData.comissao.formaPagamentoComissao}
                        onChange={(e) => handleUpdateComissao('formaPagamentoComissao', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 11. PRAZO DO CONTRATO (QUANDO NÃO EXCLUSIVIDADE) */}
              {formData.blocks.prazo && !formData.blocks.exclusividade && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2 text-slate-800">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>11. Prazo do Contrato</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data de Início</label>
                      <input
                        type="date"
                        value={formData.prazo.dataInicio}
                        onChange={(e) => handleUpdatePrazo('dataInicio', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Dias</label>
                      <input
                        type="number"
                        value={formData.prazo.quantidadeDias || ''}
                        onChange={(e) => handleUpdatePrazo('quantidadeDias', parseInt(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data de Término</label>
                      <input
                        type="date"
                        readOnly
                        value={formData.prazo.dataTermino}
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-hidden cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 12. RESCISÃO & 13. FORO */}
              {(formData.blocks.rescisao || formData.blocks.foro) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.blocks.rescisao && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-2 text-rose-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>12. Cláusula de Rescisão</span>
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">Preserva a redação jurídica padrão do modelo Word fornecido.</p>
                      <input
                        type="text"
                        value={formData.rescisao.textoClausula}
                        onChange={(e) => setFormData(prev => ({ ...prev, rescisao: { ...prev.rescisao, textoClausula: e.target.value } }))}
                        placeholder="Redação padrão do modelo oficial"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {formData.blocks.foro && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-2 text-slate-800">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <span>13. Foro da Comarca</span>
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Comarca / Cidade</label>
                          <input
                            type="text"
                            value={formData.foro.comarca}
                            onChange={(e) => setFormData(prev => ({ ...prev, foro: { ...prev.foro, comarca: e.target.value } }))}
                            placeholder="Santarém"
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                          <input
                            type="text"
                            value={formData.foro.uf}
                            onChange={(e) => setFormData(prev => ({ ...prev, foro: { ...prev.foro, uf: e.target.value } }))}
                            placeholder="PA"
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 14. ASSINATURAS E TESTEMUNHAS */}
              {formData.blocks.assinaturas && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-in fade-in space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 text-indigo-700">
                    <PenTool className="w-4 h-4" />
                    <span>14. Assinaturas e Signatários</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pb-2">
                    {[
                      { key: 'contratante' as const, label: 'Contratante' },
                      { key: 'conjuge' as const, label: 'Cônjuge', disabled: !formData.blocks.conjuge },
                      { key: 'corretor' as const, label: 'Contratado / Corretor' },
                      { key: 'testemunha1' as const, label: 'Testemunha 1' },
                      { key: 'testemunha2' as const, label: 'Testemunha 2' },
                    ].map(({ key, label, disabled }) => {
                      const isSelected = formData.assinaturas.signatarios[key];
                      return (
                        <label
                          key={key}
                          className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                              : isSelected
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={isSelected}
                            onChange={(e) => {
                              if (disabled) return;
                              setFormData(prev => ({
                                ...prev,
                                assinaturas: {
                                  ...prev.assinaturas,
                                  signatarios: {
                                    ...prev.assinaturas.signatarios,
                                    [key]: e.target.checked,
                                  }
                                }
                              }));
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded-md"
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Campos de Testemunhas */}
                  {(formData.assinaturas.signatarios.testemunha1 || formData.assinaturas.signatarios.testemunha2) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      {formData.assinaturas.signatarios.testemunha1 && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <span className="text-xs font-bold text-slate-700 block">Dados da Testemunha 1</span>
                          <input
                            type="text"
                            value={formData.assinaturas.testemunha1.nome}
                            onChange={(e) => setFormData(prev => ({ ...prev, assinaturas: { ...prev.assinaturas, testemunha1: { ...prev.assinaturas.testemunha1, nome: e.target.value } } }))}
                            placeholder="Nome Completo Testemunha 1"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                          <input
                            type="text"
                            value={formData.assinaturas.testemunha1.cpf}
                            onChange={(e) => setFormData(prev => ({ ...prev, assinaturas: { ...prev.assinaturas, testemunha1: { ...prev.assinaturas.testemunha1, cpf: e.target.value } } }))}
                            placeholder="CPF Testemunha 1"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      )}

                      {formData.assinaturas.signatarios.testemunha2 && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <span className="text-xs font-bold text-slate-700 block">Dados da Testemunha 2</span>
                          <input
                            type="text"
                            value={formData.assinaturas.testemunha2.nome}
                            onChange={(e) => setFormData(prev => ({ ...prev, assinaturas: { ...prev.assinaturas, testemunha2: { ...prev.assinaturas.testemunha2, nome: e.target.value } } }))}
                            placeholder="Nome Completo Testemunha 2"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                          <input
                            type="text"
                            value={formData.assinaturas.testemunha2.cpf}
                            onChange={(e) => setFormData(prev => ({ ...prev, assinaturas: { ...prev.assinaturas, testemunha2: { ...prev.assinaturas.testemunha2, cpf: e.target.value } } }))}
                            placeholder="CPF Testemunha 2"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO AO VIVO & GERAÇÃO DE DOCUMENTOS (5 colunas) */}
          <div className="xl:col-span-5 space-y-6 sticky top-20">
            
            {/* PAINEL DE AÇÕES DE GERAÇÃO */}
            <div className="bg-zinc-950 text-white rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-extrabold tracking-wide uppercase">16. Geração dos Documentos</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">100% Format Safe</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                O documento é gerado diretamente a partir do modelo Word (.DOCX) oficial, preservando cabeçalho, rodapé, tabelas e identidade visual.
              </p>

              {/* Botões de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                
                {/* 1. GERAR DOCX */}
                <button
                  type="button"
                  onClick={handleGenerateDocx}
                  disabled={isGeneratingDocx}
                  className="flex flex-col items-center justify-center p-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-950/50 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-xs">GERAR DOCX</span>
                  <span className="text-[9px] opacity-80 font-normal">Word Original</span>
                </button>

                {/* 2. GERAR PDF */}
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                  className="flex flex-col items-center justify-center p-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <FileText className="w-5 h-5 mb-1" />
                  <span className="text-xs">GERAR PDF</span>
                  <span className="text-[9px] opacity-80 font-normal">Visual / Download</span>
                </button>

                {/* 3. ASSINATURA DIGITAL */}
                <button
                  type="button"
                  onClick={handleSendToDigitalSignature}
                  className="flex flex-col items-center justify-center p-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-950/50 transition-all cursor-pointer active:scale-95"
                >
                  <PenTool className="w-5 h-5 mb-1" />
                  <span className="text-xs">ASSINATURA</span>
                  <span className="text-[9px] opacity-80 font-normal">Fluxo Digital</span>
                </button>

              </div>
            </div>

            {/* PRÉ-VISUALIZAÇÃO AO VIVO (A4 REAL) */}
            <div className="bg-slate-200/80 border border-slate-300 rounded-3xl p-4 shadow-inner">
              <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-300 text-slate-700">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider">15. Pré-Visualização ao Vivo</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Reflete os blocos ativos em tempo real</span>
              </div>

              {/* Folha A4 com renderização dinâmica */}
              <div className="max-h-[620px] overflow-y-auto rounded-2xl border border-slate-300/80 shadow-md bg-white p-6 sm:p-8">
                <div ref={previewRef} dangerouslySetInnerHTML={{ __html: generateModularContractHtml(formData) }} />
              </div>
            </div>

          </div>

        </div>
        </div>
      )}

      {/* VIEW 2: HISTÓRICO & STATUS DOS CONTRATOS MODULARES */}
      {activeMainView === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading tracking-tight flex items-center space-x-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>17. Gestão de Status e Contratos Gerados</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhe o ciclo de vida completo de cada contrato modular: Rascunho, Gerado, Enviado, Aguardando Assinaturas, Parcialmente Assinado e Assinado.
              </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTermHistorico}
                  onChange={(e) => setSearchTermHistorico(e.target.value)}
                  placeholder="Buscar por código, cliente..."
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <select
                value={filterStatusHistorico}
                onChange={(e) => setFilterStatusHistorico(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-hidden cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="GERADO">Gerado</option>
                <option value="ENVIADO">Enviado</option>
                <option value="AGUARDANDO ASSINATURAS">Aguardando Assinaturas</option>
                <option value="PARCIALMENTE ASSINADO">Parcialmente Assinado</option>
                <option value="ASSINADO">Assinado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Lista de Contratos */}
          {filteredContracts.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Nenhum contrato modular encontrado neste filtro.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTermHistorico('');
                  setFilterStatusHistorico('TODOS');
                  setActiveMainView('editor');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Criar Novo Contrato Modular
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Código / Data</th>
                    <th className="py-3 px-4">Título do Contrato</th>
                    <th className="py-3 px-4">Contratante / Imóvel</th>
                    <th className="py-3 px-4">Valor & Comissão</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map(record => {
                    const preco = record.precoCondicoes?.precoVenda || record.exclusividade?.precoAutorizadoVenda || 0;
                    const comissao = record.comissao?.valorComissao || record.exclusividade?.valorComissao || 0;

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{record.codigoContrato}</span>
                          <span className="text-[11px] text-slate-400">{formatDateBR(record.dataEmissao)}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {record.tituloContrato}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{record.contratante?.nome || 'Não informado'}</span>
                          <span className="text-[11px] text-slate-500">{record.imovel?.localizacao || record.imovel?.endereco || 'Imóvel'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-700 block">{formatCurrency(preco)}</span>
                          <span className="text-[11px] text-slate-500 font-medium">Comissão: {formatCurrency(comissao)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadContract(record)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title="Editar no Editor"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleLoadContract(record);
                                setTimeout(handleGenerateDocx, 300);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                              title="Baixar DOCX"
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleLoadContract(record);
                                setTimeout(handleGeneratePdf, 300);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="Baixar PDF"
                            >
                              <Download className="w-4 h-4 text-rose-600" />
                            </button>
                            {record.status === 'ASSINADO' && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleLoadContract(record);
                                  setTimeout(handleGeneratePdf, 300);
                                }}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                title="Baixar PDF Assinado"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteContract(record.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
