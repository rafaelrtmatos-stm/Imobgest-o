import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { AppUser } from '../types';
import { getStoredUsers } from '../utils/storage';
import { INITIAL_USERS } from '../data/initialData';

interface AuthScreenProps {
  users?: AppUser[];
  onLogin?: (user: AppUser) => void;
  onLoginSuccess?: (user: AppUser) => void;
  onUpdateUsers?: React.Dispatch<React.SetStateAction<AppUser[]>>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  users = [], 
  onLogin, 
  onLoginSuccess,
  onUpdateUsers 
}) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanSenha = senha.trim();

    if (!cleanEmail || !cleanSenha) {
      setErrorMessage('Por favor, informe seu e-mail e senha para acessar.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Procura usuário na lista passada ou no storage/dados padrão
      const allUsers = (users && users.length > 0) ? users : getStoredUsers();
      let foundUser = allUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);

      if (!foundUser) {
        foundUser = INITIAL_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail);
      }

      // Caso especial de segurança para o Administrador Master (rafaelrtmatos@gmail.com)
      const isMasterAdmin = cleanEmail === 'rafaelrtmatos@gmail.com';

      if (!foundUser && isMasterAdmin) {
        foundUser = INITIAL_USERS[0];
      }

      if (!foundUser) {
        setErrorMessage('E-mail não cadastrado no sistema. Verifique a digitação ou contate o Administrador.');
        setIsLoading(false);
        return;
      }

      if (foundUser.status === 'inativo' && !isMasterAdmin) {
        setErrorMessage('Esta conta de usuário está inativa. Contate o Administrador.');
        setIsLoading(false);
        return;
      }

      // Validação de senha
      const isPasswordValid = 
        foundUser.senha === cleanSenha || 
        (isMasterAdmin && (cleanSenha === 'Geper3tp@' || cleanSenha === 'geper3tp@'));

      if (!isPasswordValid) {
        setErrorMessage('Senha incorreta. Verifique se a tecla Caps Lock está ativada e tente novamente.');
        setIsLoading(false);
        return;
      }

      // Atualiza último acesso
      const updatedUser: AppUser = {
        ...foundUser,
        status: 'ativo',
        ultimoAcesso: new Date().toISOString()
      };

      setIsLoading(false);
      if (onLogin) {
        onLogin(updatedUser);
      }
      if (onLoginSuccess) {
        onLoginSuccess(updatedUser);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorativo com tons suaves */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* LOGO DO SISTEMA */}
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-emerald-600 border border-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-900/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          IMOBGESTÃO <span className="text-emerald-400">PRO</span>
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
          Sistema Imobiliário & Gestão de Contratos e Vendas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl backdrop-blur-md">
          
          <div className="mb-6 pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Acesso ao Sistema</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Entre com suas credenciais autorizadas
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <span className="text-[11px] text-slate-500">Proteção SSL/AES</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-slate-400">Manter conectado</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="text-sm">Autenticando...</span>
                ) : (
                  <>
                    <span className="text-sm">ENTRAR NO SISTEMA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informações de Segurança */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center space-x-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acesso criptografado e seguro com controle de níveis de permissão</span>
          </p>
        </div>
      </div>
    </div>
  );
};
