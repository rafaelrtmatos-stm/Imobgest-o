import React, { useState, useEffect } from 'react';
import { PenTool } from 'lucide-react';
import { ActiveTab, Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SalesForm } from './components/SalesForm';
import { EntityManager } from './components/EntityManager';
import { ContractViewer } from './components/ContractViewer';
import { CommissionReports } from './components/CommissionReports';
import { SalesList } from './components/SalesList';
import { DigitalSignatureModal } from './components/DigitalSignatureModal';
import { WordTemplateManager } from './components/WordTemplateManager';
import { DocumentGeneratorModal } from './components/DocumentGeneratorModal';
import { ClientManager } from './components/ClientManager';
import { CompanySettings } from './components/CompanySettings';
import { PublicSignPage } from './components/PublicSignPage';
import { PublicValidationPage } from './components/PublicValidationPage';
import { ClientExclusividadeFillSign } from './components/ClientExclusividadeFillSign';
import { AuthScreen } from './components/AuthScreen';
import { UserManager } from './components/UserManager';
import { ModularContractGenerator } from './components/ModularContractGenerator';
import { 
  AppUser,
  Cliente, 
  CompanyConfig, 
  Corretor, 
  DocumentTemplate, 
  Empreendimento, 
  LoteData, 
  SaleRecord, 
  StatusComissao, 
  TipoContrato 
} from './types';
import { 
  getStoredClientes, 
  getStoredCompanyConfig, 
  getStoredCorretores, 
  getStoredCurrentUser,
  getStoredEmpreendimentos, 
  getStoredSales, 
  getStoredUsers,
  getStoredWordTemplates,
  saveStoredClientes, 
  saveStoredCompanyConfig, 
  saveStoredCorretores, 
  saveStoredCurrentUser,
  saveStoredEmpreendimentos, 
  saveStoredSales,
  saveStoredUsers,
  saveStoredWordTemplates,
  updateLotStatusInEmpreendimento
} from './utils/storage';
import {
  syncAllFromSupabase,
  upsertSaleToSupabase,
  upsertClienteToSupabase,
  upsertEmpreendimentoToSupabase,
  upsertCorretorToSupabase,
  upsertWordTemplateToSupabase,
  upsertUserToSupabase,
  upsertCompanyConfigToSupabase,
  deleteFromSupabase,
  getStoredSupabaseConfig
} from './utils/supabaseClient';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredCurrentUser());
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sales, setSales] = useState<SaleRecord[]>(() => getStoredSales());
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>(() => getStoredEmpreendimentos());
  const [corretores, setCorretores] = useState<Corretor[]>(() => getStoredCorretores());
  const [wordTemplates, setWordTemplates] = useState<DocumentTemplate[]>(() => getStoredWordTemplates());
  const [clientes, setClientes] = useState<Cliente[]>(() => getStoredClientes());
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() => getStoredCompanyConfig());

  // Estado da venda atualmente ativa (para formulário, contrato ou assinatura)
  const [activeSale, setActiveSale] = useState<SaleRecord | null>(() => sales[0] || null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isDocGeneratorOpen, setIsDocGeneratorOpen] = useState(false);
  const [docGeneratorTemplate, setDocGeneratorTemplate] = useState<DocumentTemplate | null>(null);
  const [docGeneratorSale, setDocGeneratorSale] = useState<SaleRecord | null>(null);
  const [docGeneratorDefaultMode, setDocGeneratorDefaultMode] = useState<'a_vista' | 'parcelado' | undefined>(undefined);

  const [selectedMapEmpreendimentoId, setSelectedMapEmpreendimentoId] = useState<string>(
    empreendimentos[0]?.id || 'emp-1'
  );
  const [settingsSubTab, setSettingsSubTab] = useState<'empresa' | 'modelos' | 'supabase'>('empresa');

  // Callback para restaurar dados importados do Supabase
  const handleDataImportedFromSupabase = (data: {
    sales?: SaleRecord[];
    clientes?: Cliente[];
    empreendimentos?: Empreendimento[];
    corretores?: Corretor[];
    wordTemplates?: DocumentTemplate[];
    companyConfig?: CompanyConfig;
    users?: AppUser[];
  }) => {
    if (data.sales && data.sales.length > 0) setSales(data.sales);
    if (data.clientes && data.clientes.length > 0) setClientes(data.clientes);
    if (data.empreendimentos && data.empreendimentos.length > 0) setEmpreendimentos(data.empreendimentos);
    if (data.corretores && data.corretores.length > 0) setCorretores(data.corretores);
    if (data.wordTemplates && data.wordTemplates.length > 0) setWordTemplates(data.wordTemplates);
    if (data.companyConfig) setCompanyConfig(data.companyConfig);
    if (data.users && data.users.length > 0) setUsers(data.users);
  };

  // Suporte a Links Públicos de Assinatura e Validação QR Code
  const [publicSignToken, setPublicSignToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/assinar/')) {
        return path.replace('/assinar/', '');
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('assinar')) return params.get('assinar');
    }
    return null;
  });

  const [publicValidationToken, setPublicValidationToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/validar/')) {
        return path.replace('/validar/', '');
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('validar')) return params.get('validar');
    }
    return null;
  });

  const [publicExclusivityToken, setPublicExclusivityToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/contrato/preencher/')) {
        return path.replace('/contrato/preencher/', '');
      }
      if (path.startsWith('/exclusividade/')) {
        return path.replace('/exclusividade/', '');
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('preencher')) return params.get('preencher');
      if (params.get('exclusividade')) return params.get('exclusividade');
    }
    return null;
  });

  // Carregamento automático da Nuvem Supabase na inicialização
  useEffect(() => {
    const initSupabase = async () => {
      const config = getStoredSupabaseConfig();
      if (config.url && config.anonKey) {
        try {
          const res = await syncAllFromSupabase();
          if (res.success && res.data) {
            if (res.data.sales && res.data.sales.length > 0) setSales(res.data.sales);
            if (res.data.clientes && res.data.clientes.length > 0) setClientes(res.data.clientes);
            if (res.data.empreendimentos && res.data.empreendimentos.length > 0) setEmpreendimentos(res.data.empreendimentos);
            if (res.data.corretores && res.data.corretores.length > 0) setCorretores(res.data.corretores);
            if (res.data.wordTemplates && res.data.wordTemplates.length > 0) setWordTemplates(res.data.wordTemplates);
            if (res.data.companyConfig) setCompanyConfig(res.data.companyConfig);
            if (res.data.users && res.data.users.length > 0) setUsers(res.data.users);
          }
        } catch (e) {
          console.warn('Erro ao carregar dados do Supabase na inicialização:', e);
        }
      }
    };
    initSupabase();
  }, []);

  // Sincronização com o localStorage
  useEffect(() => {
    saveStoredSales(sales);
  }, [sales]);

  useEffect(() => {
    saveStoredEmpreendimentos(empreendimentos);
  }, [empreendimentos]);

  useEffect(() => {
    saveStoredCorretores(corretores);
  }, [corretores]);

  useEffect(() => {
    saveStoredWordTemplates(wordTemplates);
  }, [wordTemplates]);

  useEffect(() => {
    saveStoredClientes(clientes);
  }, [clientes]);

  useEffect(() => {
    saveStoredCompanyConfig(companyConfig);
  }, [companyConfig]);

  useEffect(() => {
    saveStoredUsers(users);
  }, [users]);

  useEffect(() => {
    saveStoredCurrentUser(currentUser);
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  const pendingSignaturesCount = sales.filter(s => !s.signatures.isFullySigned).length;

  // Handlers para Modelos Word com Auto-Sync no Supabase
  const handleAddWordTemplate = (newTemplate: DocumentTemplate) => {
    setWordTemplates(prev => [newTemplate, ...prev]);
    upsertWordTemplateToSupabase(newTemplate).catch(console.warn);
  };

  const handleUpdateWordTemplate = (updatedTemplate: DocumentTemplate) => {
    setWordTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    upsertWordTemplateToSupabase(updatedTemplate).catch(console.warn);
  };

  const handleDeleteWordTemplate = (templateId: string) => {
    setWordTemplates(prev => prev.filter(t => t.id !== templateId));
    deleteFromSupabase('word_templates', templateId).catch(console.warn);
  };

  const handleOpenDocGenerator = (
    template?: DocumentTemplate, 
    sale?: SaleRecord, 
    defaultMode?: 'a_vista' | 'parcelado'
  ) => {
    setDocGeneratorTemplate(template || wordTemplates[0] || null);
    setDocGeneratorSale(sale || activeSale || sales[0] || null);
    setDocGeneratorDefaultMode(defaultMode);
    setIsDocGeneratorOpen(true);
  };

  // Handlers para Clientes com Auto-Sync no Supabase
  const handleAddCliente = (newCliente: Cliente) => {
    setClientes(prev => [newCliente, ...prev]);
    upsertClienteToSupabase(newCliente).catch(console.warn);
  };

  const handleUpdateCliente = (updatedCliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === updatedCliente.id ? updatedCliente : c));
    upsertClienteToSupabase(updatedCliente).catch(console.warn);
  };

  const handleDeleteCliente = (clienteId: string) => {
    setClientes(prev => prev.filter(c => c.id !== clienteId));
    deleteFromSupabase('clientes', clienteId).catch(console.warn);
  };

  const handleStartSaleWithClient = (cliente: Cliente) => {
    const emp = empreendimentos[0] || {
      id: 'emp-1',
      nome: 'Reserva do Bosque Residencial',
      cidade: 'Goiânia',
      uf: 'GO',
      matriculaGeral: 'R-4/82.910',
      cartorioRegistro: '1º Ofício de Registro de Imóveis',
    };

    const newDraftSale: SaleRecord = {
      id: `draft-${Date.now()}`,
      codigoVenda: `VND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      status: 'rascunho',
      tipoContrato: 'compra_venda_parcelado',
      buyer: {
        clienteId: cliente.id,
        nome: cliente.nome,
        rg: cliente.rg || '',
        cpf: cliente.cpf,
        dataNascimento: cliente.dataNascimento || '',
        estadoCivil: cliente.estadoCivil || 'Casado(a)',
        profissao: cliente.profissao || '',
        nacionalidade: cliente.nacionalidade || 'Brasileiro(a)',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cep: cliente.cep || '',
        cidade: cliente.cidade || emp.cidade,
        uf: cliente.uf || emp.uf,
        contato1: cliente.contato1 || '',
        contato2: cliente.contato2 || '',
        email: cliente.email || '',
        nomeConjuge: cliente.nomeConjuge || '',
        cpfConjuge: cliente.cpfConjuge || '',
        rgConjuge: cliente.rgConjuge || '',
        profissaoConjuge: cliente.profissaoConjuge || '',
        regimeBens: cliente.regimeBens || 'Comunhão Parcial de Bens',
      },
      property: {
        empreendimento: emp.nome,
        empreendimentoId: emp.id,
        quadra: '01',
        lote: '01',
        areaM2: 360,
        frenteMetros: 12,
        fundoMetros: 30,
        matricula: emp.matriculaGeral,
        registroCartorio: emp.cartorioRegistro,
        cidade: emp.cidade,
        uf: emp.uf,
      },
      financial: {
        tipoPagamento: 'parcelado',
        valorTotal: 120000,
        entrada: 12000,
        quantidadeParcelas: 120,
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valorParcela: 900,
        taxaJurosMensal: 0.5,
        indiceReajuste: 'IPCA',
        formaPagamentoEntrada: 'Pix',
      },
      seller: {
        vendedorId: corretores[0]?.id || 'corretor-1',
        vendedorNome: corretores[0]?.nome || companyConfig.nomeEmpresa,
        vendedorCreci: corretores[0]?.creci || companyConfig.creci,
        vendedorTelefone: corretores[0]?.telefone || companyConfig.telefone,
        vendedorEmail: corretores[0]?.email || companyConfig.email,
        comissaoPercentual: corretores[0]?.comissaoPadraoPercentual || 5.0,
        comissaoValor: 6000,
        comissaoStatus: 'pendente',
      },
      signatures: {
        buyer: {
          name: cliente.nome,
          role: 'Comprador(a)',
          documentNumber: `CPF ${cliente.cpf}`,
          signatureImage: null,
          signedAt: null,
        },
        seller: {
          name: corretores[0]?.nome || companyConfig.nomeEmpresa,
          role: 'Corretor(a) / Vendedor(a)',
          documentNumber: `CRECI ${corretores[0]?.creci || companyConfig.creci}`,
          signatureImage: null,
          signedAt: null,
        },
        isFullySigned: false,
      },
    };

    setActiveSale(newDraftSale);
    setActiveTab('sales_form');
  };

  // Criar / Salvar Venda / Contrato com Auto-Sync no Supabase
  const handleSaveSale = (
    savedSale: SaleRecord, 
    openContract: boolean, 
    openSignatureModal: boolean
  ) => {
    setSales(prev => {
      const existsIndex = prev.findIndex(s => s.id === savedSale.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = savedSale;
        return next;
      }
      return [savedSale, ...prev];
    });

    // Salva no Supabase em tempo real
    upsertSaleToSupabase(savedSale).catch(console.warn);

    // Se comprador não existe na lista de clientes, cadastra automaticamente
    if (savedSale.buyer.nome && savedSale.buyer.cpf) {
      setClientes(prev => {
        const exists = prev.some(c => c.cpf.replace(/\D/g, '') === savedSale.buyer.cpf.replace(/\D/g, ''));
        if (!exists) {
          const newClient: Cliente = {
            id: `cli-${Date.now()}`,
            nome: savedSale.buyer.nome,
            cpf: savedSale.buyer.cpf,
            rg: savedSale.buyer.rg || '',
            nacionalidade: savedSale.buyer.nacionalidade || 'Brasileiro(a)',
            estadoCivil: savedSale.buyer.estadoCivil || 'Casado(a)',
            profissao: savedSale.buyer.profissao || '',
            contato1: savedSale.buyer.contato1 || '',
            contato2: savedSale.buyer.contato2 || '',
            email: savedSale.buyer.email || '',
            cep: savedSale.buyer.cep || '',
            endereco: savedSale.buyer.endereco || '',
            numero: savedSale.buyer.numero || '',
            complemento: savedSale.buyer.complemento || '',
            bairro: savedSale.buyer.bairro || '',
            cidade: savedSale.buyer.cidade || '',
            uf: savedSale.buyer.uf || '',
            nomeConjuge: savedSale.buyer.nomeConjuge || '',
            cpfConjuge: savedSale.buyer.cpfConjuge || '',
            rgConjuge: savedSale.buyer.rgConjuge || '',
            profissaoConjuge: savedSale.buyer.profissaoConjuge || '',
            regimeBens: savedSale.buyer.regimeBens || 'Comunhão Parcial de Bens',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          upsertClienteToSupabase(newClient).catch(console.warn);
          return [newClient, ...prev];
        }
        return prev;
      });
    }

    // Atualiza status do lote
    setEmpreendimentos(prevEmps => {
      const updated = updateLotStatusInEmpreendimento(
        prevEmps,
        savedSale.property.empreendimentoId,
        savedSale.property.quadra,
        savedSale.property.lote,
        'vendido',
        savedSale.buyer.nome
      );
      const changedEmp = updated.find(e => e.id === savedSale.property.empreendimentoId);
      if (changedEmp) {
        upsertEmpreendimentoToSupabase(changedEmp).catch(console.warn);
      }
      return updated;
    });

    setActiveSale(savedSale);

    if (openSignatureModal) {
      setIsSignatureModalOpen(true);
      setActiveTab('contract_viewer');
    } else if (openContract) {
      setActiveTab('contract_viewer');
    } else {
      setActiveTab('sales_list');
    }
  };

  // Callback de Assinatura Digital
  const handleSaveSignature = (updatedSale: SaleRecord) => {
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    setActiveSale(updatedSale);
    upsertSaleToSupabase(updatedSale).catch(console.warn);
  };

  // Ação ao selecionar um lote no mapa
  const handleSelectLotForSale = (empId: string, quadraNumero: string, lot: LoteData) => {
    const emp = empreendimentos.find(e => e.id === empId) || empreendimentos[0];
    
    // Cria proposta base com lote selecionado
    const newDraftSale: SaleRecord = {
      id: `draft-${Date.now()}`,
      codigoVenda: `VND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      status: 'rascunho',
      tipoContrato: 'compra_venda_parcelado',
      buyer: {
        nome: '',
        rg: '',
        cpf: '',
        dataNascimento: '',
        estadoCivil: 'Casado(a)',
        profissao: '',
        nacionalidade: 'Brasileiro(a)',
        endereco: '',
        numero: '',
        bairro: '',
        cep: '',
        cidade: emp.cidade,
        uf: emp.uf,
        contato1: '',
        contato2: '',
      },
      property: {
        empreendimento: emp.nome,
        empreendimentoId: emp.id,
        quadra: quadraNumero,
        lote: lot.numero,
        areaM2: lot.area,
        frenteMetros: lot.frente,
        fundoMetros: lot.fundo,
        matricula: emp.matriculaGeral,
        registroCartorio: emp.cartorioRegistro,
        cidade: emp.cidade,
        uf: emp.uf,
      },
      financial: {
        tipoPagamento: 'parcelado',
        valorTotal: lot.valor,
        entrada: lot.valor * 0.1, // 10% de entrada sugerida
        quantidadeParcelas: 120,
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valorParcela: Number(((lot.valor * 0.9) / 120).toFixed(2)),
        taxaJurosMensal: 0.5,
        indiceReajuste: 'IPCA',
        formaPagamentoEntrada: 'Pix',
      },
      seller: {
        vendedorId: corretores[0]?.id || 'corretor-1',
        vendedorNome: corretores[0]?.nome || companyConfig.nomeEmpresa,
        vendedorCreci: corretores[0]?.creci || companyConfig.creci,
        vendedorTelefone: corretores[0]?.telefone || companyConfig.telefone,
        vendedorEmail: corretores[0]?.email || companyConfig.email,
        comissaoPercentual: corretores[0]?.comissaoPadraoPercentual || 5.0,
        comissaoValor: Number(((lot.valor * (corretores[0]?.comissaoPadraoPercentual || 5.0)) / 100).toFixed(2)),
        comissaoStatus: 'pendente',
      },
      signatures: {
        buyer: {
          name: '',
          role: 'Comprador(a)',
          documentNumber: '',
          signatureImage: null,
          signedAt: null,
        },
        seller: {
          name: corretores[0]?.nome || companyConfig.nomeEmpresa,
          role: 'Corretor(a) / Vendedor(a)',
          documentNumber: `CRECI ${corretores[0]?.creci || companyConfig.creci}`,
          signatureImage: null,
          signedAt: null,
        },
        isFullySigned: false,
      },
    };

    setActiveSale(newDraftSale);
    setActiveTab('sales_form');
  };

  // Atualizar coordenadas GPS / Planta de um lote
  const handleUpdateCoordinates = (
    empId: string, 
    quadraNumero: string, 
    loteNumero: string, 
    coords: [number, number][]
  ) => {
    setEmpreendimentos(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        quadras: emp.quadras.map(q => {
          if (q.numero.toLowerCase() !== quadraNumero.toLowerCase()) return q;
          return {
            ...q,
            lotes: q.lotes.map(l => {
              if (l.numero.toLowerCase() !== loteNumero.toLowerCase()) return l;
              return { ...l, coordenadasGeograficas: coords };
            }),
          };
        }),
      };
    }));
  };

  // Lançar Nova Venda em Branco
  const handleNewSale = () => {
    setActiveSale(null);
    setActiveTab('sales_form');
  };

  // Excluir venda / contrato
  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    if (confirm(`Deseja realmente excluir a venda ${saleToDelete.codigoVenda} (${saleToDelete.property.empreendimento} - Quadra ${saleToDelete.property.quadra}, Lote ${saleToDelete.property.lote})?`)) {
      setSales(prev => prev.filter(s => s.id !== saleId));
      deleteFromSupabase('sales', saleId).catch(console.warn);
      
      // Libera o lote novamente
      setEmpreendimentos(prev => {
        const updated = updateLotStatusInEmpreendimento(
          prev,
          saleToDelete.property.empreendimentoId,
          saleToDelete.property.quadra,
          saleToDelete.property.lote,
          'disponivel',
          undefined
        );
        const changedEmp = updated.find(e => e.id === saleToDelete.property.empreendimentoId);
        if (changedEmp) {
          upsertEmpreendimentoToSupabase(changedEmp).catch(console.warn);
        }
        return updated;
      });

      if (activeSale?.id === saleId) {
        setActiveSale(null);
      }
    }
  };

  // Atualizar status de comissão
  const handleUpdateCommissionStatus = (saleId: string, newStatus: StatusComissao) => {
    setSales(prev => {
      const updated = prev.map(s => {
        if (s.id === saleId) {
          const mod = {
            ...s,
            seller: {
              ...s.seller,
              comissaoStatus: newStatus,
            },
          };
          upsertSaleToSupabase(mod).catch(console.warn);
          return mod;
        }
        return s;
      });
      return updated;
    });
  };

  // Modificar tipo de contrato em tempo real no visualizador
  const handleChangeContractType = (newType: TipoContrato) => {
    if (!activeSale) return;
    const updated = {
      ...activeSale,
      tipoContrato: newType,
    };
    setActiveSale(updated);
    setSales(prev => prev.map(s => s.id === updated.id ? updated : s));
    upsertSaleToSupabase(updated).catch(console.warn);
  };

  // CRUD Empreendimentos & Corretores com Auto-Sync no Supabase
  const handleAddEmpreendimento = (newEmp: Empreendimento) => {
    setEmpreendimentos(prev => [newEmp, ...prev]);
    upsertEmpreendimentoToSupabase(newEmp).catch(console.warn);
  };

  const handleUpdateEmpreendimento = (updatedEmp: Empreendimento) => {
    setEmpreendimentos(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    upsertEmpreendimentoToSupabase(updatedEmp).catch(console.warn);
  };

  const handleDeleteEmpreendimento = (empId: string) => {
    setEmpreendimentos(prev => prev.filter(e => e.id !== empId));
    deleteFromSupabase('empreendimentos', empId).catch(console.warn);
  };

  const handleAddLote = (empId: string, quadraNumero: string, newLote: LoteData) => {
    setEmpreendimentos(prev => {
      const updated = prev.map(e => {
        if (e.id === empId) {
          const quadraIndex = e.quadras.findIndex(q => q.numero.toLowerCase() === quadraNumero.toLowerCase());
          let updatedQuadras = [...e.quadras];
          if (quadraIndex >= 0) {
            updatedQuadras[quadraIndex] = {
              ...updatedQuadras[quadraIndex],
              lotes: [...updatedQuadras[quadraIndex].lotes, newLote],
            };
          } else {
            updatedQuadras.push({
              id: `qd-${Date.now()}`,
              numero: quadraNumero,
              lotes: [newLote],
            });
          }
          return {
            ...e,
            quadras: updatedQuadras,
            totalLotes: updatedQuadras.reduce((acc, q) => acc + q.lotes.length, 0),
          };
        }
        return e;
      });
      const changed = updated.find(e => e.id === empId);
      if (changed) upsertEmpreendimentoToSupabase(changed).catch(console.warn);
      return updated;
    });
  };

  const handleUpdateLote = (empId: string, quadraNumero: string, updatedLote: LoteData) => {
    setEmpreendimentos(prev => {
      const updated = prev.map(e => {
        if (e.id === empId) {
          const updatedQuadras = e.quadras.map(q => {
            if (q.numero.toLowerCase() === quadraNumero.toLowerCase()) {
              return {
                ...q,
                lotes: q.lotes.map(l => l.id === updatedLote.id ? updatedLote : l),
              };
            }
            return q;
          });
          return {
            ...e,
            quadras: updatedQuadras,
          };
        }
        return e;
      });
      const changed = updated.find(e => e.id === empId);
      if (changed) upsertEmpreendimentoToSupabase(changed).catch(console.warn);
      return updated;
    });
  };

  const handleDeleteLote = (empId: string, quadraNumero: string, loteId: string) => {
    setEmpreendimentos(prev => {
      const updated = prev.map(e => {
        if (e.id === empId) {
          const updatedQuadras = e.quadras.map(q => {
            if (q.numero.toLowerCase() === quadraNumero.toLowerCase()) {
              return {
                ...q,
                lotes: q.lotes.filter(l => l.id !== loteId),
              };
            }
            return q;
          });
          return {
            ...e,
            quadras: updatedQuadras,
            totalLotes: updatedQuadras.reduce((acc, q) => acc + q.lotes.length, 0),
          };
        }
        return e;
      });
      const changed = updated.find(e => e.id === empId);
      if (changed) upsertEmpreendimentoToSupabase(changed).catch(console.warn);
      return updated;
    });
  };

  const handleAddCorretor = (newCorretor: Corretor) => {
    setCorretores(prev => [...prev, newCorretor]);
    upsertCorretorToSupabase(newCorretor).catch(console.warn);
  };

  const handleUpdateCorretor = (updatedCorretor: Corretor) => {
    setCorretores(prev => prev.map(c => c.id === updatedCorretor.id ? updatedCorretor : c));
    upsertCorretorToSupabase(updatedCorretor).catch(console.warn);
  };

  const handleDeleteCorretor = (corretorId: string) => {
    setCorretores(prev => prev.filter(c => c.id !== corretorId));
    deleteFromSupabase('corretores', corretorId).catch(console.warn);
  };

  // Visualização direta se acessado via link público de preenchimento e assinatura de exclusividade
  if (publicExclusivityToken) {
    return (
      <ClientExclusividadeFillSign
        token={publicExclusivityToken}
        onBackToApp={() => {
          setPublicExclusivityToken(null);
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  // Visualização direta se acessado via link público de assinatura
  if (publicSignToken) {
    return (
      <PublicSignPage
        token={publicSignToken}
        onBackToApp={() => {
          setPublicSignToken(null);
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState(null, '', '/');
          }
        }}
        onViewValidation={(vt) => {
          setPublicSignToken(null);
          setPublicValidationToken(vt);
        }}
      />
    );
  }

  // Visualização direta se acessado via link/QR Code público de validação
  if (publicValidationToken) {
    return (
      <PublicValidationPage
        token={publicValidationToken}
        onBackToApp={() => {
          setPublicValidationToken(null);
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  // TELA DE AUTENTICAÇÃO E LOGIN SE NÃO ESTIVER LOGADO
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={(user) => setCurrentUser(user)}
        users={users}
        onUpdateUsers={setUsers}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* NAVBAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewSale={handleNewSale}
        pendingSignaturesCount={pendingSignaturesCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
        {/* 0. DASHBOARD EXECUTIVO */}
        {activeTab === 'dashboard' && (
          <Dashboard
            sales={sales}
            empreendimentos={empreendimentos}
            clientes={clientes}
            corretores={corretores}
            onNavigate={(tab) => setActiveTab(tab)}
            onNewSale={handleNewSale}
            onSelectSale={(sale) => {
              setActiveSale(sale);
              setActiveTab('sales_form');
            }}
            onOpenWordDoc={(sale) => {
              handleOpenDocGenerator(undefined, sale);
            }}
          />
        )}

        {/* 1. EMPREENDIMENTOS & LOTES (SEM MAPA - CADASTRO DIRETO) */}
        {(activeTab === 'empreendimentos' || activeTab === 'map_explorer') && (
          <EntityManager
            empreendimentos={empreendimentos}
            corretores={corretores}
            onAddEmpreendimento={handleAddEmpreendimento}
            onUpdateEmpreendimento={handleUpdateEmpreendimento}
            onDeleteEmpreendimento={handleDeleteEmpreendimento}
            onAddLote={handleAddLote}
            onUpdateLote={handleUpdateLote}
            onDeleteLote={handleDeleteLote}
            onAddCorretor={handleAddCorretor}
            onUpdateCorretor={handleUpdateCorretor}
            onDeleteCorretor={handleDeleteCorretor}
          />
        )}

        {/* 2. CLIENTES */}
        {activeTab === 'clientes' && (
          <ClientManager
            clientes={clientes}
            sales={sales}
            empreendimentos={empreendimentos}
            onAddCliente={handleAddCliente}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
            onStartSaleWithClient={handleStartSaleWithClient}
          />
        )}

        {/* 3. VENDAS (FORMULÁRIO OU LISTA) */}
        {activeTab === 'sales_form' && (
          <SalesForm
            empreendimentos={empreendimentos}
            corretores={corretores}
            initialSaleData={activeSale}
            onSaveSale={handleSaveSale}
            onOpenMap={(empId) => {
              setSelectedMapEmpreendimentoId(empId);
              setActiveTab('map_explorer');
            }}
            onOpenWordGenerator={(sale, mode) => {
              handleOpenDocGenerator(undefined, sale, mode);
            }}
          />
        )}

        {activeTab === 'sales_list' && (
          <SalesList
            sales={sales}
            onViewContract={(sale) => {
              setActiveSale(sale);
              setActiveTab('contract_viewer');
            }}
            onEditSale={(sale) => {
              setActiveSale(sale);
              setActiveTab('sales_form');
            }}
            onOpenSignatureModal={(sale) => {
              setActiveSale(sale);
              setIsSignatureModalOpen(true);
            }}
            onDeleteSale={handleDeleteSale}
            onNewSale={handleNewSale}
            onGenerateWordDoc={(sale) => {
              handleOpenDocGenerator(undefined, sale);
            }}
          />
        )}

        {/* 4. MODELOS & DOCUMENTOS (CENTRAL OFICIAL DE CONTRATOS) */}
        {(activeTab === 'word_templates' || (activeTab as string) === 'modular_contracts') && (
          <WordTemplateManager
            templates={wordTemplates}
            onSaveTemplates={(newTemplates) => setWordTemplates(newTemplates)}
            sales={sales}
            clientes={clientes}
            empreendimentos={empreendimentos}
            corretores={corretores}
            currentUser={currentUser}
            companyConfig={companyConfig}
            onOpenGenerator={(template, sale, defaultMode) => {
              handleOpenDocGenerator(template, sale, defaultMode);
            }}
            onOpenDigitalSignatureFlow={(contratoData) => {
              if (sales.length > 0) {
                setActiveSale(sales[0]);
              }
              setIsSignatureModalOpen(true);
            }}
            isSettingsMode={false}
            onNavigateToSettings={() => {
              setSettingsSubTab('modelos');
              setActiveTab('company_settings');
            }}
          />
        )}

        {activeTab === 'contract_viewer' && (
          activeSale ? (
            <ContractViewer
              sale={activeSale}
              companyConfig={companyConfig}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
              onChangeContractType={handleChangeContractType}
              onBackToSales={() => setActiveTab('sales_list')}
              onOpenPublicSignModal={(t) => setPublicSignToken(t)}
              onOpenValidationModal={(vt) => setPublicValidationToken(vt)}
            />
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <PenTool className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-heading font-bold text-slate-900 tracking-tight">Nenhum Contrato Selecionado</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Inicie um novo lançamento no formulário ou selecione uma venda cadastrada para visualizar as cláusulas, gerar PDF e autenticar assinaturas.
              </p>
              <button
                onClick={handleNewSale}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                + Lançar Nova Venda Agora
              </button>
            </div>
          )
        )}

        {/* 5. COMISSÕES */}
        {activeTab === 'commissions' && (
          <CommissionReports
            sales={sales}
            corretores={corretores}
            onUpdateCommissionStatus={handleUpdateCommissionStatus}
            onViewSaleContract={(sale) => {
              setActiveSale(sale);
              setActiveTab('contract_viewer');
            }}
          />
        )}

        {/* 6. GESTÃO DE USUÁRIOS (ADMINISTRADOR MASTER E EQUIPE) */}
        {activeTab === 'usuarios' && (
          currentUser.role === 'admin' ? (
            <UserManager
              users={users}
              onSaveUsers={setUsers}
              currentUser={currentUser}
            />
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Acesso Restrito ao Administrador</h2>
              <p className="text-sm text-slate-600">
                Apenas administradores podem gerenciar e adicionar novos usuários ao sistema.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Voltar ao Dashboard
              </button>
            </div>
          )
        )}

        {/* 7. CONFIGURAÇÕES (EMPRESA, MODELOS WORD & SUPABASE CLOUD) */}
        {activeTab === 'company_settings' && (
          <CompanySettings
            config={companyConfig}
            onSaveConfig={(newConfig) => setCompanyConfig(newConfig)}
            templates={wordTemplates}
            onSaveTemplates={(newTemplates) => setWordTemplates(newTemplates)}
            sales={sales}
            clientes={clientes}
            empreendimentos={empreendimentos}
            corretores={corretores}
            users={users}
            onDataImported={handleDataImportedFromSupabase}
            onOpenGenerator={(template, sale) => {
              handleOpenDocGenerator(template, sale);
            }}
            activeSubTab={settingsSubTab}
            onChangeSubTab={(tab) => setSettingsSubTab(tab)}
          />
        )}
      </main>

      {/* MODAL DO GERADOR DE DOCUMENTOS WORD / PDF */}
      {isDocGeneratorOpen && (
        <DocumentGeneratorModal
          isOpen={isDocGeneratorOpen}
          onClose={() => setIsDocGeneratorOpen(false)}
          templates={wordTemplates}
          sales={sales}
          initialTemplate={docGeneratorTemplate || undefined}
          initialSale={docGeneratorSale || undefined}
          initialMode={docGeneratorDefaultMode}
        />
      )}

      {/* MODAL DE ASSINATURA DIGITAL */}
      {isSignatureModalOpen && activeSale && (
        <DigitalSignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          sale={activeSale}
          onSaveSignature={handleSaveSignature}
        />
      )}

      {/* FOOTER */}
      <footer className="bg-white text-slate-500 text-xs py-5 border-t border-slate-200 text-center no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <p className="font-mono text-slate-700">
              © {new Date().getFullYear()} <strong className="text-slate-900">ImobGestão Pro</strong> — Gestão de Loteamentos & Contratos Word
            </p>
          </div>
          <p className="text-slate-500 font-mono text-[11px]">
            Conforme Lei Federal nº 6.766/79 • MP 2.200-2/2001 • Assinatura Eletrônica Certificada
          </p>
        </div>
      </footer>
    </div>
  );
}
