import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cliente, Contrato, Venda } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

const SUPABASE_CONFIG_KEY = 'imobgestao_supabase_config_v2';
const SUPABASE_LAST_SYNC_KEY = 'imobgestao_supabase_last_sync_v2';

const getEnvVar = (key: string): string => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {
    // ignore
  }
  return '';
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: getEnvVar('VITE_SUPABASE_URL'),
  anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  autoSync: true,
};

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const item = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!item) return DEFAULT_SUPABASE_CONFIG;
    const parsed = JSON.parse(item);
    return {
      url: parsed.url || DEFAULT_SUPABASE_CONFIG.url,
      anonKey: parsed.anonKey || DEFAULT_SUPABASE_CONFIG.anonKey,
      autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
    };
  } catch (e) {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  cachedClient = null;
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(SUPABASE_LAST_SYNC_KEY);
}

function setLastSyncTime(dateStr: string): void {
  localStorage.setItem(SUPABASE_LAST_SYNC_KEY, dateStr);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) return null;
  if (cachedClient) return cachedClient;
  try {
    cachedClient = createClient(config.url.trim(), config.anonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return cachedClient;
  } catch (error) {
    console.error('Erro ao instanciar Supabase Client:', error);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'URL ou Chave do Supabase não configuradas.' };
  try {
    const { error } = await client.from('clientes').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { success: true, message: 'Conectado! As tabelas ainda precisam ser criadas no SQL Editor.' };
      }
      return { success: false, message: `Erro: ${error.message}` };
    }
    return { success: true, message: 'Conexão ativa e tabelas prontas.' };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message || 'erro desconhecido'}` };
  }
}

export async function upsertClienteToSupabase(cliente: Cliente): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('clientes').upsert({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data: cliente,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function upsertContratoToSupabase(contrato: Contrato): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('contratos').upsert({
      id: contrato.id,
      numero: contrato.numero,
      cliente_id: contrato.clienteId,
      status: contrato.status,
      valor: contrato.valor,
      data: contrato,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function upsertVendaToSupabase(venda: Venda): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('vendas').upsert({
      id: venda.id,
      contrato_id: venda.contratoId,
      valor: venda.valor,
      status: venda.status,
      data: venda,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteFromSupabase(table: 'clientes' | 'contratos' | 'vendas', id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from(table).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: { clientes?: Cliente[]; contratos?: Contrato[]; vendas?: Venda[] };
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado.' };
  try {
    const resultData: any = {};

    const { data: clientesRes, error: clientesErr } = await client.from('clientes').select('data');
    if (!clientesErr && clientesRes) resultData.clientes = clientesRes.map((r: any) => r.data).filter(Boolean);

    const { data: contratosRes, error: contratosErr } = await client.from('contratos').select('data');
    if (!contratosErr && contratosRes) resultData.contratos = contratosRes.map((r: any) => r.data).filter(Boolean);

    const { data: vendasRes, error: vendasErr } = await client.from('vendas').select('data');
    if (!vendasErr && vendasRes) resultData.vendas = vendasRes.map((r: any) => r.data).filter(Boolean);

    const nowStr = new Date().toLocaleString('pt-BR');
    setLastSyncTime(nowStr);

    return { success: true, message: `Dados baixados do Supabase com sucesso (${nowStr})!`, data: resultData };
  } catch (err: any) {
    return { success: false, message: `Erro ao baixar dados do Supabase: ${err.message || 'falha inesperada'}` };
  }
}

export async function syncAllToSupabase(payload: {
  clientes: Cliente[];
  contratos: Contrato[];
  vendas: Venda[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado.' };

  const errors: string[] = [];
  try {
    if (payload.clientes.length > 0) {
      const rows = payload.clientes.map(c => ({
        id: c.id, nome: c.nome, telefone: c.telefone || '', email: c.email || '', data: c,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await client.from('clientes').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Clientes: ${error.message}`);
    }

    if (payload.contratos.length > 0) {
      const rows = payload.contratos.map(c => ({
        id: c.id, numero: c.numero, cliente_id: c.clienteId, status: c.status, valor: c.valor, data: c,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await client.from('contratos').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Contratos: ${error.message}`);
    }

    if (payload.vendas.length > 0) {
      const rows = payload.vendas.map(v => ({
        id: v.id, contrato_id: v.contratoId, valor: v.valor, status: v.status, data: v,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await client.from('vendas').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Vendas: ${error.message}`);
    }

    if (errors.length > 0) {
      return { success: false, message: `Avisos ao sincronizar: ${errors.join(' | ')}` };
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    setLastSyncTime(nowStr);
    return { success: true, message: `Todos os dados foram salvos no Supabase com sucesso (${nowStr})!` };
  } catch (err: any) {
    return { success: false, message: `Erro na sincronização: ${err.message || 'falha inesperada'}` };
  }
}

/**
 * Remove todas as linhas das tabelas no Supabase (usado por "Zerar Informações").
 */
export async function clearAllSupabaseData(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: true, message: 'Supabase não configurado — nada a limpar na nuvem.' };
  const errors: string[] = [];
  for (const table of ['vendas', 'contratos', 'clientes'] as const) {
    try {
      const { error } = await client.from(table).delete().neq('id', '__none__');
      if (error) errors.push(`${table}: ${error.message}`);
    } catch (err: any) {
      errors.push(`${table}: ${err.message || 'erro desconhecido'}`);
    }
  }
  if (errors.length > 0) return { success: false, message: errors.join(' | ') };
  return { success: true, message: 'Dados da nuvem removidos com sucesso.' };
}

export function getSupabaseSqlSchema(): string {
  return `-- ==============================================================================
-- SCHEMA IMOBGESTÃO — GESTÃO DE CONTRATOS
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em "Run"
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contratos (
    id TEXT PRIMARY KEY,
    numero TEXT,
    cliente_id TEXT,
    status TEXT,
    valor NUMERIC,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vendas (
    id TEXT PRIMARY KEY,
    contrato_id TEXT,
    valor NUMERIC,
    status TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon all on clientes" ON public.clientes;
    CREATE POLICY "Allow anon all on clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on contratos" ON public.contratos;
    CREATE POLICY "Allow anon all on contratos" ON public.contratos FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on vendas" ON public.vendas;
    CREATE POLICY "Allow anon all on vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
}
