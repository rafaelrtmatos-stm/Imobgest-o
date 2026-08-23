import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle,
  UserCheck,
  Award,
  Sparkles,
  Lock
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface UserManagerProps {
  currentUser: AppUser;
  users: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateUser: (id: string, user: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole | 'inativo'>('all');
  
  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Modal de Troca de Senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AppUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    senha: string;
    role: UserRole;
    telefone: string;
    creci: string;
    cargo: string;
    status: 'ativo' | 'inativo';
  }>({
    nome: '',
    email: '',
    senha: '',
    role: 'corretor',
    telefone: '',
    creci: '',
    cargo: 'Corretor de Imóveis',
    status: 'ativo',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Filtragem de Usuários
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      user.nome.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.telefone && user.telefone.toLowerCase().includes(term)) ||
      (user.creci && user.creci.toLowerCase().includes(term)) ||
      (user.cargo && user.cargo.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (selectedRoleFilter === 'all') return true;
    if (selectedRoleFilter === 'inativo') return user.status === 'inativo';
    return user.role === selectedRoleFilter;
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      nome: '',
      email: '',
      senha: generateRandomPassword(),
      role: 'corretor',
      telefone: '',
      creci: '',
      cargo: 'Corretor(a) de Imóveis',
      status: 'ativo',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: '', // Deixa vazio para não alterar a menos que digitado
      role: user.role,
      telefone: user.telefone || '',
      creci: user.creci || '',
      cargo: user.cargo || '',
      status: user.status,
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenPasswordModal = (user: AppUser) => {
    setPasswordTargetUser(user);
    setNewPasswordValue(generateRandomPassword());
    setShowNewPassword(true);
    setIsPasswordModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNome = formData.nome.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanNome || !cleanEmail) {
      setFormError('Nome completo e E-mail são campos obrigatórios.');
      return;
    }

    // Verifica se e-mail já existe para outro usuário
    const emailExists = users.some(u => 
      u.email.toLowerCase() === cleanEmail && u.id !== editingUserId
    );

    if (emailExists) {
      setFormError('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    if (!editingUserId && !formData.senha) {
      setFormError('Informe uma senha inicial para o novo usuário.');
      return;
    }

    if (editingUserId) {
      // Atualização
      const updatePayload: Partial<AppUser> = {
        nome: cleanNome,
        email: cleanEmail,
        role: formData.role,
        telefone: formData.telefone.trim(),
        creci: formData.creci.trim(),
        cargo: formData.cargo.trim(),
        status: formData.status,
      };

      if (formData.senha.trim()) {
        updatePayload.senha = formData.senha.trim();
      }

      onUpdateUser(editingUserId, updatePayload);
      setFormSuccess('Usuário atualizado com sucesso!');
    } else {
      // Criação de novo usuário
      onAddUser({
        nome: cleanNome,
        email: cleanEmail,
        senha: formData.senha.trim(),
        role: formData.role,
        telefone: formData.telefone.trim(),
        creci: formData.creci.trim(),
        cargo: formData.cargo.trim(),
        status: formData.status,
        criadoPor: currentUser.email,
      });
      setFormSuccess('Novo usuário adicionado com sucesso!');
    }

    setTimeout(() => {
      setIsModalOpen(false);
    }, 600);
  };

  const handleSaveNewPassword = () => {
    if (!passwordTargetUser || !newPasswordValue.trim()) return;

    onUpdateUser(passwordTargetUser.id, {
      senha: newPasswordValue.trim()
    });

    setIsPasswordModalOpen(false);
  };

  const handleCopyCredentials = (user: AppUser, passwordToCopy?: string) => {
    const pass = passwordToCopy || user.senha || '(senha oculta)';
    const text = `*Credenciais de Acesso - ImobGestão Pro*\n👤 Usuário: ${user.nome}\n📧 E-mail: ${user.email}\n🔑 Senha: ${pass}\n💼 Função: ${getRoleLabel(user.role)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = (user: AppUser) => {
    if (user.id === currentUser.id) {
      alert('Você não pode excluir a sua própria conta de administrador.');
      return;
    }

    if (user.email.toLowerCase() === 'rafaelrtmatos@gmail.com') {
      alert('A conta do Administrador Master Rafael Matos não pode ser excluída.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o usuário "${user.nome}" (${user.email})?`)) {
      onDeleteUser(user.id);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador Master';
      case 'gerente': return 'Gerente Comercial';
      case 'corretor': return 'Corretor de Imóveis';
      case 'financeiro': return 'Financeiro';
      default: return role;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'gerente':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'corretor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'financeiro':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const corretoresCount = users.filter(u => u.role === 'corretor').length;
  const activeCount = users.filter(u => u.status === 'ativo').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* CABEÇALHO DO GERENCIADOR DE USUÁRIOS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
                  Gestão de Usuários & Equipe
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  ADM Ativo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Cadastre e gerencie <strong>quantos usuários quiser</strong> (corretores, gerentes e administradores) com permissões completas de acesso.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Administrador:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-800 border border-slate-300">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              id="btn-add-new-user"
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO DE MÉTRICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-medium">Total de Usuários</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-heading">{totalUsers}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Contas cadastradas</p>
          </div>

          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs text-purple-700 font-medium">Administradores</p>
            <p className="text-2xl font-extrabold text-purple-900 mt-1 font-heading">{adminCount}</p>
            <p className="text-[11px] text-purple-600 mt-0.5 font-medium">Acesso irrestrito</p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs text-emerald-700 font-medium">Corretores</p>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1 font-heading">{corretoresCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Emissão de vendas</p>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs text-blue-700 font-medium">Usuários Ativos</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1 font-heading">{activeCount}</p>
            <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Liberados para login</p>
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, CRECI..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'admin', label: 'Administradores' },
            { id: 'gerente', label: 'Gerentes' },
            { id: 'corretor', label: 'Corretores' },
            { id: 'inativo', label: 'Inativos' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRoleFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRoleFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA / GRID DE USUÁRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => {
          const isCurrentAdmin = user.email.toLowerCase() === 'rafaelrtmatos@gmail.com';
          const isSelf = user.id === currentUser.id;

          return (
            <div 
              key={user.id}
              className={`bg-white rounded-2xl border transition-all hover:shadow-md p-5 flex flex-col justify-between ${
                user.status === 'inativo'
                  ? 'border-slate-200 bg-slate-50/50 opacity-75'
                  : isCurrentAdmin
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-xs ${
                      user.role === 'admin'
                        ? 'bg-purple-900 text-purple-200'
                        : user.role === 'gerente'
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-slate-800 text-emerald-400'
                    }`}>
                      {user.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                        <span className="truncate max-w-[160px]">{user.nome}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            Você
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[170px]">{user.email}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                {/* Detalhes & Metadados */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {user.cargo && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Cargo:</span>
                      </span>
                      <span className="font-semibold text-slate-800">{user.cargo}</span>
                    </div>
                  )}

                  {user.creci && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>CRECI:</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">{user.creci}</span>
                    </div>
                  )}

                  {user.telefone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>Telefone:</span>
                      </span>
                      <span className="font-medium text-slate-800">{user.telefone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-bold flex items-center space-x-1 ${
                      user.status === 'ativo' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {user.status === 'ativo' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Inativo</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleOpenPasswordModal(user)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Alterar Senha de Acesso"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(user)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copiar dados de acesso"
                  >
                    {copiedId === user.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateUser(user.id, { status: user.status === 'ativo' ? 'inativo' : 'ativo' })}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      user.status === 'ativo' 
                        ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={user.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                  >
                    {user.status === 'ativo' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(user)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {!isCurrentAdmin && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum usuário encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não foram encontrados usuários para os critérios de busca ou filtros selecionados.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center space-x-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Usuário</span>
          </button>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE USUÁRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    {editingUserId ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina as informações de cadastro e credenciais
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Carlos Alberto Ferreira"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ex: corretor@imobgestao.com.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {editingUserId ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, senha: generateRandomPassword() })}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gerar Senha</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder={editingUserId ? 'Deixe em branco para não alterar' : 'Senha segura'}
                    className="w-full px-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nível / Perfil *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="corretor">Corretor de Imóveis</option>
                    <option value="gerente">Gerente Comercial</option>
                    <option value="admin">Administrador Master</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status da Conta *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="ativo">Ativo (Liberado)</option>
                    <option value="inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(62) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Registro CRECI
                  </label>
                  <input
                    type="text"
                    value={formData.creci}
                    onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                    placeholder="34.521-GO"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cargo / Função Exibida
                </label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="ex: Corretor(a) de Vendas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RESET / ALTERAÇÃO DE SENHA */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    Definir Nova Senha
                  </h3>
                  <p className="text-xs text-slate-500">
                    Usuário: <strong>{passwordTargetUser.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Nova Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordValue(generateRandomPassword())}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Nova</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-slate-500 text-[11px]">
                  Ao confirmar, a nova senha substituirá a anterior imediatamente. Você poderá copiar o resumo para enviar ao usuário via WhatsApp.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewPassword}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar Nova Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
