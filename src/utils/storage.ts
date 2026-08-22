import { Cliente, Contrato, Venda } from '../types';
import { INITIAL_CLIENTES, INITIAL_CONTRATOS, INITIAL_VENDAS } from '../data/initialData';

const CLIENTES_KEY = 'imobgestao_clientes_v2';
const CONTRATOS_KEY = 'imobgestao_contratos_v2';
const VENDAS_KEY = 'imobgestao_vendas_v2';

function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Erro ao ler ${key}:`, error);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error);
  }
}

export const getStoredClientes = (): Cliente[] => getItem(CLIENTES_KEY, INITIAL_CLIENTES);
export const saveStoredClientes = (clientes: Cliente[]): void => setItem(CLIENTES_KEY, clientes);

export const getStoredContratos = (): Contrato[] => getItem(CONTRATOS_KEY, INITIAL_CONTRATOS);
export const saveStoredContratos = (contratos: Contrato[]): void => setItem(CONTRATOS_KEY, contratos);

export const getStoredVendas = (): Venda[] => getItem(VENDAS_KEY, INITIAL_VENDAS);
export const saveStoredVendas = (vendas: Venda[]): void => setItem(VENDAS_KEY, vendas);

/**
 * Remove TODOS os dados locais do sistema (clientes, contratos e vendas).
 */
export function clearAllStoredData(): void {
  localStorage.removeItem(CLIENTES_KEY);
  localStorage.removeItem(CONTRATOS_KEY);
  localStorage.removeItem(VENDAS_KEY);
}
