import { AppUser, Cliente, CompanyConfig, Corretor, DocumentTemplate, Empreendimento, SaleRecord } from '../types';
import { INITIAL_CLIENTES, INITIAL_COMPANY_CONFIG, INITIAL_CORRETORES, INITIAL_EMPREENDIMENTOS, INITIAL_SALES, INITIAL_USERS } from '../data/initialData';
import { DEFAULT_WORD_TEMPLATES } from './docxProcessor';

const SALES_STORAGE_KEY = 'imobgestao_sales_v1';
const EMPREENDIMENTOS_STORAGE_KEY = 'imobgestao_empreendimentos_v1';
const CORRETORES_STORAGE_KEY = 'imobgestao_corretores_v1';
const WORD_TEMPLATES_STORAGE_KEY = 'imobgestao_word_templates_v1';
const CLIENTES_STORAGE_KEY = 'imobgestao_clientes_v1';
const COMPANY_CONFIG_STORAGE_KEY = 'imobgestao_company_config_v1';
const USERS_STORAGE_KEY = 'imobgestao_users_v1';
const CURRENT_USER_STORAGE_KEY = 'imobgestao_current_user_v1';

export function getStoredUsers(): AppUser[] {
  try {
    const item = localStorage.getItem(USERS_STORAGE_KEY);
    let users: AppUser[] = [];
    if (!item) {
      users = INITIAL_USERS;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    } else {
      users = JSON.parse(item);
    }

    // Garante que o administrador mestre (rafaelrtmatos@gmail.com) sempre existe e tem as credenciais corretas
    const adminIndex = users.findIndex(u => u.email.toLowerCase() === 'rafaelrtmatos@gmail.com');
    if (adminIndex === -1) {
      const masterAdmin = INITIAL_USERS[0];
      users.unshift(masterAdmin);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } else {
      // Se a senha estiver vazia ou status inativo, recupera acesso do admin
      if (!users[adminIndex].senha || users[adminIndex].status !== 'ativo') {
        users[adminIndex].senha = 'Geper3tp@';
        users[adminIndex].status = 'ativo';
        users[adminIndex].role = 'admin';
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }

    return users;
  } catch (error) {
    console.error('Erro ao ler usuários do localStorage:', error);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Erro ao salvar usuários no localStorage:', error);
  }
}

export function getStoredCurrentUser(): AppUser | null {
  try {
    const item = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler usuário logado:', error);
    return null;
  }
}

export function saveStoredCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Erro ao salvar usuário logado:', error);
  }
}

export function getStoredClientes(): Cliente[] {
  try {
    const item = localStorage.getItem(CLIENTES_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTES));
      return INITIAL_CLIENTES;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler clientes do localStorage:', error);
    return INITIAL_CLIENTES;
  }
}

export function saveStoredClientes(clientes: Cliente[]): void {
  try {
    localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(clientes));
  } catch (error) {
    console.error('Erro ao salvar clientes no localStorage:', error);
  }
}

export function getStoredCompanyConfig(): CompanyConfig {
  try {
    const item = localStorage.getItem(COMPANY_CONFIG_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(COMPANY_CONFIG_STORAGE_KEY, JSON.stringify(INITIAL_COMPANY_CONFIG));
      return INITIAL_COMPANY_CONFIG;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler configurações da empresa:', error);
    return INITIAL_COMPANY_CONFIG;
  }
}

export function saveStoredCompanyConfig(config: CompanyConfig): void {
  try {
    localStorage.setItem(COMPANY_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configurações da empresa:', error);
  }
}

export function getStoredWordTemplates(): DocumentTemplate[] {
  try {
    const item = localStorage.getItem(WORD_TEMPLATES_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(WORD_TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_WORD_TEMPLATES));
      return DEFAULT_WORD_TEMPLATES;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler modelos Word do localStorage:', error);
    return DEFAULT_WORD_TEMPLATES;
  }
}

export function saveStoredWordTemplates(templates: DocumentTemplate[]): void {
  try {
    localStorage.setItem(WORD_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Erro ao salvar modelos Word no localStorage:', error);
  }
}

export function getStoredSales(): SaleRecord[] {
  try {
    const item = localStorage.getItem(SALES_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(INITIAL_SALES));
      return INITIAL_SALES;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler vendas do localStorage:', error);
    return INITIAL_SALES;
  }
}

export function saveStoredSales(sales: SaleRecord[]): void {
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  } catch (error) {
    console.error('Erro ao salvar vendas no localStorage:', error);
  }
}

export function getStoredEmpreendimentos(): Empreendimento[] {
  try {
    const item = localStorage.getItem(EMPREENDIMENTOS_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(EMPREENDIMENTOS_STORAGE_KEY, JSON.stringify(INITIAL_EMPREENDIMENTOS));
      return INITIAL_EMPREENDIMENTOS;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler empreendimentos do localStorage:', error);
    return INITIAL_EMPREENDIMENTOS;
  }
}

export function saveStoredEmpreendimentos(emps: Empreendimento[]): void {
  try {
    localStorage.setItem(EMPREENDIMENTOS_STORAGE_KEY, JSON.stringify(emps));
  } catch (error) {
    console.error('Erro ao salvar empreendimentos no localStorage:', error);
  }
}

export function getStoredCorretores(): Corretor[] {
  try {
    const item = localStorage.getItem(CORRETORES_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(CORRETORES_STORAGE_KEY, JSON.stringify(INITIAL_CORRETORES));
      return INITIAL_CORRETORES;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Erro ao ler corretores do localStorage:', error);
    return INITIAL_CORRETORES;
  }
}

export function saveStoredCorretores(corretores: Corretor[]): void {
  try {
    localStorage.setItem(CORRETORES_STORAGE_KEY, JSON.stringify(corretores));
  } catch (error) {
    console.error('Erro ao salvar corretores no localStorage:', error);
  }
}

/**
 * Atualiza o status do lote no empreendimento correspondente quando uma venda é criada ou alterada
 */
export function updateLotStatusInEmpreendimento(
  empreendimentos: Empreendimento[],
  empreendimentoId: string,
  quadraNumero: string,
  loteNumero: string,
  status: 'disponivel' | 'reservado' | 'vendido',
  compradorNome?: string,
  clienteId?: string,
  vendaId?: string,
  contratoId?: string
): Empreendimento[] {
  return empreendimentos.map(emp => {
    if (emp.id !== empreendimentoId && emp.nome !== empreendimentoId) return emp;
    return {
      ...emp,
      quadras: emp.quadras.map(quadra => {
        const qMatch = quadra.numero.toLowerCase().replace(/\s+/g, '') === quadraNumero.toLowerCase().replace(/\s+/g, '') ||
                       quadra.numero.toLowerCase().includes(quadraNumero.toLowerCase()) || 
                       quadraNumero.toLowerCase().includes(quadra.numero.toLowerCase());
        if (!qMatch) {
          return quadra;
        }
        return {
          ...quadra,
          lotes: quadra.lotes.map(lote => {
            const lMatch = lote.numero.toLowerCase().replace(/\s+/g, '') === loteNumero.toLowerCase().replace(/\s+/g, '') ||
                           lote.numero.toLowerCase().includes(loteNumero.toLowerCase()) || 
                           loteNumero.toLowerCase().includes(lote.numero.toLowerCase());
            if (!lMatch) {
              return lote;
            }
            return {
              ...lote,
              status,
              compradorNome: status === 'vendido' || status === 'reservado' ? (compradorNome || lote.compradorNome) : undefined,
              clienteId: status === 'vendido' ? (clienteId || lote.clienteId) : undefined,
              vendaId: status === 'vendido' ? (vendaId || lote.vendaId) : undefined,
              contratoId: status === 'vendido' ? (contratoId || lote.contratoId) : undefined,
            };
          })
        };
      })
    };
  });
}
