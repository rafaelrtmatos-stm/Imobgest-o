import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  UserCheck, 
  FileText, 
  X, 
  Check, 
  Sparkles,
  Layers,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Cliente, Empreendimento, SaleRecord } from '../types';
import { maskCPF, maskPhone, maskCEP, formatCurrency, formatDateBR } from '../utils/formatters';

interface ClientManagerProps {
  clientes: Cliente[];
  sales: SaleRecord[];
  empreendimentos: Empreendimento[];
  onAddCliente: (cliente: Cliente) => void;
  onUpdateCliente: (cliente: Cliente) => void;
  onDeleteCliente: (clienteId: string) => void;
  onStartSaleWithClient: (cliente: Cliente) => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({
  clientes,
  sales,
  empreendimentos,
  onAddCliente,
  onUpdateCliente,
  onDeleteCliente,
  onStartSaleWithClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Cliente | null>(null);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    nacionalidade: 'Brasileiro(a)',
    estadoCivil: 'Casado(a)',
    profissao: '',
    contato1: '',
    contato2: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'Goiânia',
    uf: 'GO',
    nomeConjuge: '',
    cpfConjuge: '',
    rgConjuge: '',
    profissaoConjuge: '',
    regimeBens: 'Comunhão Parcial de Bens',
    observacoes: '',
  });

  const handleOpenNewModal = () => {
    setEditingClient(null);
    setFormData({
      nome: '',
      cpf: '',
      rg: '',
      nacionalidade: 'Brasileiro(a)',
      estadoCivil: 'Casado(a)',
      profissao: '',
      contato1: '',
      contato2: '',
      email: '',
      cep: '74230-100',
      endereco: 'Av. T-63',
      numero: '1200',
      complemento: 'Apto 502',
      bairro: 'Setor Bueno',
      cidade: 'Goiânia',
      uf: 'GO',
      nomeConjuge: '',
      cpfConjuge: '',
      rgConjuge: '',
      profissaoConjuge: '',
      regimeBens: 'Comunhão Parcial de Bens',
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Cliente) => {
    setEditingClient(c);
    setFormData({
      nome: c.nome || '',
      cpf: c.cpf || '',
      rg: c.rg || '',
      nacionalidade: c.nacionalidade || 'Brasileiro(a)',
      estadoCivil: c.estadoCivil || 'Casado(a)',
      profissao: c.profissao || '',
      contato1: c.contato1 || '',
      contato2: c.contato2 || '',
      email: c.email || '',
      cep: c.cep || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      bairro: c.bairro || '',
      cidade: c.cidade || 'Goiânia',
      uf: c.uf || 'GO',
      nomeConjuge: c.nomeConjuge || '',
      cpfConjuge: c.cpfConjuge || '',
      rgConjuge: c.rgConjuge || '',
      profissaoConjuge: c.profissaoConjuge || '',
      regimeBens: c.regimeBens || 'Comunhão Parcial de Bens',
      observacoes: c.observacoes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    if (editingClient) {
      const updated: Cliente = {
        ...editingClient,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      onUpdateCliente(updated);
    } else {
      const novo: Cliente = {
        id: `cli-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddCliente(novo);
    }
    setIsModalOpen(false);
  };

  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      c.cpf.includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.cidade.toLowerCase().includes(term)
    );
  });

  // Retorna as vendas deste cliente
  const getClientSales = (client: Cliente): SaleRecord[] => {
    return sales.filter(s => 
      s.buyer.clienteId === client.id || 
      s.buyer.cpf.replace(/\D/g, '') === client.cpf.replace(/\D/g, '') ||
      s.buyer.nome.toLowerCase() === client.nome.toLowerCase()
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-heading">Gestão de Clientes</h1>
          </div>
          <p className="text-sm text-slate-500">
            Cadastre compradores, gerencie dados de contato, dados de cônjuge e acompanhe lotes vinculados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-client"
            onClick={handleOpenNewModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR & METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center">
          <Search className="w-5 h-5 text-slate-400 ml-3 mr-2" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, e-mail ou cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-3 cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between px-4">
          <span className="text-xs text-slate-500 font-medium">Total de Clientes</span>
          <span className="text-lg font-bold text-slate-900">{clientes.length}</span>
        </div>
      </div>

      {/* CLIENT CARDS GRID */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-500">Tente ajustar o termo da busca ou cadastre um novo cliente.</p>
          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map(cliente => {
            const clientSales = getClientSales(cliente);
            const hasPurchases = clientSales.length > 0;

            return (
              <div 
                key={cliente.id}
                id={`card-client-${cliente.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{cliente.nome}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">CPF: {cliente.cpf || 'Não informado'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      hasPurchases 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {hasPurchases ? `${clientSales.length} Lote(s)` : 'Prospecto'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cliente.contato1 || 'Sem telefone'}</span>
                    </div>
                    {cliente.email && (
                      <div className="flex items-center space-x-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cliente.cidade} - {cliente.uf}</span>
                    </div>
                    {cliente.nomeConjuge && (
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Cônjuge: {cliente.nomeConjuge}</span>
                      </div>
                    )}
                  </div>

                  {/* VÍNCULO DE LOTES COMPRADOS */}
                  {hasPurchases && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <p className="font-semibold text-slate-700 flex items-center space-x-1">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lotes Adquiridos:</span>
                      </p>
                      {clientSales.map(s => (
                        <div key={s.id} className="text-[11px] text-slate-600 flex justify-between">
                          <span>{s.property.empreendimento} (Qd {s.property.quadra}, Lt {s.property.lote})</span>
                          <span className="font-medium text-emerald-700">{formatCurrency(s.financial.valorTotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onStartSaleWithClient(cliente)}
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Fazer Venda</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(cliente)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar Cliente"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Excluir cadastro do cliente "${cliente.nome}"?`)) {
                        onDeleteCliente(cliente.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              {/* DADOS PESSOAIS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Dados Pessoais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Carlos Alberto da Silva"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">RG</label>
                    <input
                      type="text"
                      value={formData.rg}
                      onChange={e => setFormData({ ...formData, rg: e.target.value })}
                      placeholder="Ex: 4.890.120 SSP/GO"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Estado Civil</label>
                    <select
                      value={formData.estadoCivil}
                      onChange={e => setFormData({ ...formData, estadoCivil: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="União Estável">União Estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Profissão</label>
                    <input
                      type="text"
                      value={formData.profissao}
                      onChange={e => setFormData({ ...formData, profissao: e.target.value })}
                      placeholder="Ex: Engenheiro Agrônomo"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* CONTATO & ENDEREÇO */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Contato & Endereço</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.contato1}
                      onChange={e => setFormData({ ...formData, contato1: maskPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@email.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Ex: Av. T-63"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Número</label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={e => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="1200"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Setor Bueno"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Goiânia"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.uf}
                      onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="GO"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* CÔNJUGE (SE CASADO) */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Dados do Cônjuge (Opcional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Cônjuge</label>
                    <input
                      type="text"
                      value={formData.nomeConjuge}
                      onChange={e => setFormData({ ...formData, nomeConjuge: e.target.value })}
                      placeholder="Nome completo do(a) cônjuge"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CPF do Cônjuge</label>
                    <input
                      type="text"
                      value={formData.cpfConjuge}
                      onChange={e => setFormData({ ...formData, cpfConjuge: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Regime de Bens</label>
                    <select
                      value={formData.regimeBens}
                      onChange={e => setFormData({ ...formData, regimeBens: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option>
                      <option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option>
                      <option value="Separação Total de Bens">Separação Total de Bens</option>
                      <option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
