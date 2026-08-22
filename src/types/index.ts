export type StatusContrato = 'ativo' | 'concluido' | 'cancelado';
export type StatusVenda = 'pendente' | 'confirmada' | 'cancelada';

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venda {
  id: string;
  contratoId: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  status: StatusVenda;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contrato {
  id: string;
  numero: string;
  clienteId: string;
  titulo: string;
  dataContrato: string; // AAAA-MM-DD
  valor: number;
  status: StatusContrato;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}
