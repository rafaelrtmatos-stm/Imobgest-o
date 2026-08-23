import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AppUser, 
  Cliente, 
  CompanyConfig, 
  Corretor, 
  DocumentTemplate, 
  Empreendimento, 
  SaleRecord 
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

const SUPABASE_CONFIG_KEY = 'imobgestao_supabase_config_v1';
const SUPABASE_LAST_SYNC_KEY = 'imobgestao_supabase_last_sync_v1';

const getEnvVar = (key: string): string => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (e) {
    // ignore
  }
  return '';
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: getEnvVar('VITE_SUPABASE_URL') || 'https://pqapnnjvhiritesxcpgr.supabase.co',
  anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_9DRmzFE8YpsnpJeahj29PQ_a_4kIPAt',
  autoSync: true,
};

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const item = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!item) {
      return DEFAULT_SUPABASE_CONFIG;
    }
    const parsed = JSON.parse(item);
    return {
      url: parsed.url || DEFAULT_SUPABASE_CONFIG.url,
      anonKey: parsed.anonKey || DEFAULT_SUPABASE_CONFIG.anonKey,
      autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
    };
  } catch (e) {
    console.error('Erro ao ler configuração do Supabase:', e);
    return DEFAULT_SUPABASE_CONFIG;
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    // Reset client to reinitialize
    cachedClient = null;
  } catch (e) {
    console.error('Erro ao salvar configuração do Supabase:', e);
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(SUPABASE_LAST_SYNC_KEY);
}

export function setLastSyncTime(dateStr: string): void {
  localStorage.setItem(SUPABASE_LAST_SYNC_KEY, dateStr);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url.trim(), config.anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (error) {
    console.error('Erro ao instanciar Supabase Client:', error);
    return null;
  }
}

/**
 * Testa a conexão com o Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou Chave do Supabase não configuradas.' };
  }

  try {
    // Tenta uma consulta simples
    const { error: salesError } = await client
      .from('sales')
      .select('id')
      .limit(1);

    if (salesError) {
      if (salesError.code === 'PGRST116' || salesError.message?.includes('does not exist') || salesError.code === '42P01') {
        return { 
          success: true, 
          message: 'Conectado com sucesso ao Supabase! (Observação: as tabelas precisam ser criadas no SQL Editor).',
          tablesFound: []
        };
      }
      return { 
        success: false, 
        message: `Erro na resposta do Supabase: ${salesError.message || salesError.code}` 
      };
    }

    return { 
      success: true, 
      message: 'Conexão ativa e tabelas prontas para sincronização!',
      tablesFound: ['sales']
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: `Falha na requisição ao Supabase: ${err.message || 'Erro desconhecido'}` 
    };
  }
}

/**
 * Salva ou atualiza uma venda no Supabase
 */
export async function upsertSaleToSupabase(sale: SaleRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('sales').upsert({
      id: sale.id,
      cliente_nome: sale.buyer?.nome || '',
      cliente_cpf: sale.buyer?.cpf || '',
      imovel_nome: sale.property?.empreendimento || '',
      valor_total: sale.financial?.valorTotal || 0,
      status: sale.status,
      data: sale,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar venda no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar venda no Supabase:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um cliente no Supabase
 */
export async function upsertClienteToSupabase(cliente: Cliente): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('clientes').upsert({
      id: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone || cliente.contato1 || '',
      email: cliente.email || '',
      data: cliente,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar cliente no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar cliente no Supabase:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um empreendimento no Supabase
 */
export async function upsertEmpreendimentoToSupabase(emp: Empreendimento): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('empreendimentos').upsert({
      id: emp.id,
      nome: emp.nome,
      cidade: emp.cidade,
      uf: emp.uf,
      total_lotes: emp.totalLotes,
      data: emp,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar empreendimento no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar empreendimento no Supabase:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um modelo de contrato no Supabase
 */
export async function upsertWordTemplateToSupabase(template: DocumentTemplate): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('word_templates').upsert({
      id: template.id,
      nome: template.nome,
      tipo_documento: template.tipoDocumento,
      file_name: template.fileName,
      data: template,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar modelo no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar modelo no Supabase:', err);
    return false;
  }
}

/**
 * Exclui um registro do Supabase
 */
export async function deleteFromSupabase(table: 'sales' | 'clientes' | 'empreendimentos' | 'corretores' | 'word_templates' | 'app_users', id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) {
      console.warn(`Aviso ao excluir de ${table} no Supabase:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Erro ao excluir de ${table} no Supabase:`, err);
    return false;
  }
}

/**
 * Salva ou atualiza um usuário no Supabase
 */
export async function upsertUserToSupabase(user: AppUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('app_users').upsert({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      status: user.status,
      data: user,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar usuário no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar usuário no Supabase:', err);
    return false;
  }
}

/**
 * Salva ou atualiza a configuração da empresa no Supabase
 */
export async function upsertCompanyConfigToSupabase(config: CompanyConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('company_config').upsert({
      id: 'default',
      nome_empresa: config.nomeEmpresa,
      cpf_cnpj: config.cpfCnpj,
      data: config,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar empresa no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar empresa no Supabase:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um corretor no Supabase
 */
export async function upsertCorretorToSupabase(corretor: Corretor): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('corretores').upsert({
      id: corretor.id,
      nome: corretor.nome,
      creci: corretor.creci || '',
      data: corretor,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso ao sincronizar corretor no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar corretor no Supabase:', err);
    return false;
  }
}

/**
 * Sincroniza todos os dados locais para o Supabase (Upload / Backup)
 */
export async function syncAllToSupabase(payload: {
  sales: SaleRecord[];
  clientes: Cliente[];
  empreendimentos: Empreendimento[];
  corretores: Corretor[];
  wordTemplates: DocumentTemplate[];
  companyConfig: CompanyConfig;
  users: AppUser[];
}): Promise<{ success: boolean; message: string; details?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    const errors: string[] = [];

    // 1. Sincroniza Vendas
    if (payload.sales.length > 0) {
      const salesRows = payload.sales.map(s => ({
        id: s.id,
        cliente_nome: s.buyer?.nome || '',
        cliente_cpf: s.buyer?.cpf || '',
        imovel_nome: s.property?.empreendimento || '',
        valor_total: s.financial?.valorTotal || 0,
        status: s.status,
        data: s,
        updated_at: new Date().toISOString(),
      }));

      const { error: salesErr } = await client.from('sales').upsert(salesRows, { onConflict: 'id' });
      if (salesErr) errors.push(`Vendas: ${salesErr.message}`);
    }

    // 2. Sincroniza Clientes
    if (payload.clientes.length > 0) {
      const clientesRows = payload.clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        cpf: c.cpf,
        telefone: c.telefone || c.contato1 || '',
        email: c.email || '',
        data: c,
        updated_at: new Date().toISOString(),
      }));

      const { error: clientesErr } = await client.from('clientes').upsert(clientesRows, { onConflict: 'id' });
      if (clientesErr) errors.push(`Clientes: ${clientesErr.message}`);
    }

    // 3. Sincroniza Empreendimentos
    if (payload.empreendimentos.length > 0) {
      const empRows = payload.empreendimentos.map(e => ({
        id: e.id,
        nome: e.nome,
        cidade: e.cidade,
        uf: e.uf,
        total_lotes: e.totalLotes,
        data: e,
        updated_at: new Date().toISOString(),
      }));

      const { error: empErr } = await client.from('empreendimentos').upsert(empRows, { onConflict: 'id' });
      if (empErr) errors.push(`Empreendimentos: ${empErr.message}`);
    }

    // 4. Sincroniza Corretores
    if (payload.corretores.length > 0) {
      const corrRows = payload.corretores.map(c => ({
        id: c.id,
        nome: c.nome,
        creci: c.creci || '',
        data: c,
        updated_at: new Date().toISOString(),
      }));

      const { error: corrErr } = await client.from('corretores').upsert(corrRows, { onConflict: 'id' });
      if (corrErr) errors.push(`Corretores: ${corrErr.message}`);
    }

    // 5. Sincroniza Modelos de Contratos
    if (payload.wordTemplates.length > 0) {
      const templRows = payload.wordTemplates.map(t => ({
        id: t.id,
        nome: t.nome,
        tipo_documento: t.tipoDocumento,
        file_name: t.fileName,
        data: t,
        updated_at: new Date().toISOString(),
      }));

      const { error: templErr } = await client.from('word_templates').upsert(templRows, { onConflict: 'id' });
      if (templErr) errors.push(`Modelos: ${templErr.message}`);
    }

    // 6. Sincroniza Configurações da Empresa
    const { error: configErr } = await client.from('company_config').upsert({
      id: 'default',
      nome_empresa: payload.companyConfig.nomeEmpresa,
      cpf_cnpj: payload.companyConfig.cpfCnpj,
      data: payload.companyConfig,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (configErr) errors.push(`Config Empresa: ${configErr.message}`);

    // 7. Sincroniza Usuários
    if (payload.users.length > 0) {
      const userRows = payload.users.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        status: u.status,
        data: u,
        updated_at: new Date().toISOString(),
      }));

      const { error: userErr } = await client.from('app_users').upsert(userRows, { onConflict: 'id' });
      if (userErr) errors.push(`Usuários: ${userErr.message}`);
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Houve avisos ao sincronizar com algumas tabelas: ${errors.join(' | ')}. Verifique se executou o script SQL no Supabase.`,
      };
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    setLastSyncTime(nowStr);

    return {
      success: true,
      message: `Todos os dados foram salvos no Supabase com sucesso (${nowStr})!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro na sincronização: ${err.message || 'Falha inesperada'}`,
    };
  }
}

/**
 * Baixa todos os dados da nuvem do Supabase para o sistema local
 */
export async function syncAllFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: {
    sales?: SaleRecord[];
    clientes?: Cliente[];
    empreendimentos?: Empreendimento[];
    corretores?: Corretor[];
    wordTemplates?: DocumentTemplate[];
    companyConfig?: CompanyConfig;
    users?: AppUser[];
  };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    const resultData: any = {};

    // 1. Vendas
    const { data: salesRes, error: salesErr } = await client.from('sales').select('data');
    if (!salesErr && salesRes) {
      resultData.sales = salesRes.map(r => r.data).filter(Boolean);
    }

    // 2. Clientes
    const { data: clientesRes, error: clientesErr } = await client.from('clientes').select('data');
    if (!clientesErr && clientesRes) {
      resultData.clientes = clientesRes.map(r => r.data).filter(Boolean);
    }

    // 3. Empreendimentos
    const { data: empRes, error: empErr } = await client.from('empreendimentos').select('data');
    if (!empErr && empRes) {
      resultData.empreendimentos = empRes.map(r => r.data).filter(Boolean);
    }

    // 4. Corretores
    const { data: corrRes, error: corrErr } = await client.from('corretores').select('data');
    if (!corrErr && corrRes) {
      resultData.corretores = corrRes.map(r => r.data).filter(Boolean);
    }

    // 5. Modelos
    const { data: templRes, error: templErr } = await client.from('word_templates').select('data');
    if (!templErr && templRes) {
      resultData.wordTemplates = templRes.map(r => r.data).filter(Boolean);
    }

    // 6. Config Empresa
    // Usa maybeSingle() em vez de single(): quando ainda não existe nenhuma
    // configuração salva (id = 'default'), o PostgREST responde 406 com
    // .single() — maybeSingle() retorna null silenciosamente nesse caso.
    const { data: configRes, error: configErr } = await client.from('company_config').select('data').eq('id', 'default').maybeSingle();
    if (!configErr && configRes?.data) {
      resultData.companyConfig = configRes.data;
    }

    // 7. Usuários
    const { data: userRes, error: userErr } = await client.from('app_users').select('data');
    if (!userErr && userRes) {
      resultData.users = userRes.map(r => r.data).filter(Boolean);
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    setLastSyncTime(nowStr);

    return {
      success: true,
      message: `Dados baixados do Supabase com sucesso (${nowStr})!`,
      data: resultData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao baixar dados do Supabase: ${err.message || 'Falha inesperada'}`,
    };
  }
}

/**
 * Retorna o script SQL completo para rodar no Supabase SQL Editor
 */
export function getSupabaseSqlSchema(): string {
  return `-- ==============================================================================
-- SCHEMA IMOBGESTÃO PRO - SUPABASE POSTGRESQL
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em "Run"
-- ==============================================================================

-- 1. TABELA DE VENDAS E CONTRATOS
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    cliente_nome TEXT,
    cliente_cpf TEXT,
    imovel_nome TEXT,
    valor_total NUMERIC,
    status TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE CLIENTES / COMPRADORES
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT,
    telefone TEXT,
    email TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE EMPREENDIMENTOS E LOTES
CREATE TABLE IF NOT EXISTS public.empreendimentos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cidade TEXT,
    uf TEXT,
    total_lotes INTEGER,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE CORRETORES
CREATE TABLE IF NOT EXISTS public.corretores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    creci TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE MODELOS DE CONTRATOS (.DOCX)
CREATE TABLE IF NOT EXISTS public.word_templates (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo_documento TEXT,
    file_name TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE CONFIGURAÇÕES DA EMPRESA / IMOBILIÁRIA
CREATE TABLE IF NOT EXISTS public.company_config (
    id TEXT PRIMARY KEY,
    nome_empresa TEXT,
    cpf_cnpj TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE USUÁRIOS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT,
    status TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS PÚBLICAS/ANÔNIMAS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO TOTAL PARA CHAVE PÚBLICA (ANON)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon all on sales" ON public.sales;
    CREATE POLICY "Allow anon all on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on clientes" ON public.clientes;
    CREATE POLICY "Allow anon all on clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on empreendimentos" ON public.empreendimentos;
    CREATE POLICY "Allow anon all on empreendimentos" ON public.empreendimentos FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on corretores" ON public.corretores;
    CREATE POLICY "Allow anon all on corretores" ON public.corretores FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on word_templates" ON public.word_templates;
    CREATE POLICY "Allow anon all on word_templates" ON public.word_templates FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on company_config" ON public.company_config;
    CREATE POLICY "Allow anon all on company_config" ON public.company_config FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on app_users" ON public.app_users;
    CREATE POLICY "Allow anon all on app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
}
