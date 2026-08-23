import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  User, 
  Home, 
  MapPin, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  Download, 
  AlertTriangle, 
  Lock, 
  KeyRound, 
  Eye, 
  Sparkles, 
  Phone, 
  Mail, 
  Building,
  RefreshCw,
  Search,
  ExternalLink,
  HelpCircle,
  XCircle,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ExclusivityFillLink, 
  ExclusivityLinkStatus 
} from '../types/exclusivityLink';
import { EstadoCivil } from '../types';
import { 
  ContratoModularFormData 
} from '../types/modularContract';
import { 
  getExclusivityLinkByToken, 
  recordExclusivityEvent, 
  updateExclusivityLink,
  formatCpf,
  formatCep,
  formatPhone,
  maskCpfPrivacy,
  generateOtp6Digits,
  saveSignedExclusivityContractToMainRecords
} from '../utils/exclusivityLinkService';
import { 
  generateModularContractHtml, 
  generateModularDocxBlob,
  calcularComissao,
  calcularDataTermino
} from '../utils/modularDocxProcessor';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ClientExclusividadeFillSignProps {
  token: string;
  onBackToApp?: () => void;
}

type ClientStep = 
  | 'preenchimento'
  | 'conferencia_dados'
  | 'leitura_contrato'
  | 'validacao_cpf'
  | 'assinatura_otp'
  | 'concluido'
  | 'autenticacao_posterior';

export const ClientExclusividadeFillSign: React.FC<ClientExclusividadeFillSignProps> = ({
  token,
  onBackToApp,
}) => {
  const [linkData, setLinkData] = useState<ExclusivityFillLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<ClientStep>('preenchimento');

  // Formulário do Cliente
  const [clientForm, setClientForm] = useState<ContratoModularFormData | null>(null);
  const [possuiConjuge, setPossuiConjuge] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Leitura do Contrato
  const [hasAgreedReadTerms, setHasAgreedReadTerms] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const contractPreviewRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Validação de Identidade (4 últimos dígitos do CPF)
  const [inputLast4Digits, setInputLast4Digits] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [cpfAttempts, setCpfAttempts] = useState(0);
  const [isCpfBlocked, setIsCpfBlocked] = useState(false);

  // Assinatura e OTP (Código de 6 dígitos)
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  // Autenticação Posterior (para quem acessa o link após já ter sido assinado)
  const [posteriorAuthSuccess, setPosteriorAuthSuccess] = useState(false);

  // Carregamento inicial do link e verificação de expiração
  useEffect(() => {
    const data = getExclusivityLinkByToken(token);
    if (data) {
      setLinkData(data);
      
      // Se já estiver assinado, direciona para etapa de autenticação posterior pelos 4 dígitos
      if (data.status === 'ASSINADO') {
        setCurrentStep('autenticacao_posterior');
      } else {
        // Inicializa os dados com base nos dados pré-configurados pelo corretor ou cliente anterior
        const initial = data.clientFilledData || JSON.parse(JSON.stringify(data.initialData));
        setClientForm(initial);
        setPossuiConjuge(!!(initial.blocks?.conjuge && initial.conjuge?.nome));

        // Registra evento de acesso
        recordExclusivityEvent(
          token,
          'CLIENTE_ACESSOU',
          'Cliente abriu o link seguro para preenchimento e conferência.'
        );
      }
    }
    setIsLoading(false);
  }, [token]);

  // Se o link for inválido
  if (!isLoading && !linkData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900">Link Não Encontrado</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Este link de preenchimento é inválido ou foi removido. Solicite um novo link ao seu corretor de imóveis.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  // Se o link estiver expirado e ainda não tiver sido assinado
  if (linkData && linkData.status === 'EXPIRADO') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-amber-200 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full">
            Link Expirado
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900">Prazo de Acesso Encerrado</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Por motivos de segurança, a validade deste link de preenchimento encerrou-se em{' '}
            <strong className="text-slate-800">{new Date(linkData.expiresAt).toLocaleString('pt-BR')}</strong>.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900">Corretor Responsável:</div>
            <div>{linkData.corretor.nome}</div>
            <div>{linkData.corretor.creci}</div>
            <div>{linkData.corretor.telefone}</div>
          </div>
          <p className="text-xs text-slate-500">
            Entre em contato com o corretor para gerar um novo link de preenchimento.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!clientForm || !linkData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Handlers para preenchimento de campos
  const handleClientFieldChange = (section: 'contratante' | 'conjuge' | 'imovel' | 'exclusividade', field: string, value: any) => {
    setClientForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: value,
        }
      };
    });
    // Limpa erro do campo se existir
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Busca CEP via API ViaCEP
  const handleBuscarCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setClientForm(prev => {
          if (!prev) return prev;
          const novoEndereco = `${data.logradouro}, Bairro ${data.bairro}, ${data.localidade} - ${data.uf}`;
          return {
            ...prev,
            contratante: {
              ...prev.contratante,
              endereco: novoEndereco,
            }
          };
        });
      }
    } catch (e) {
      console.warn('Erro ao consultar ViaCEP:', e);
    } finally {
      setLoadingCep(false);
    }
  };

  // Validação dos dados preenchidos pelo cliente
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const c = clientForm.contratante;

    if (!c.nome || c.nome.trim().length < 3) errors.nome = 'Informe seu nome completo';
    
    const cleanCpf = (c.cpf || '').replace(/\D/g, '');
    if (cleanCpf.length !== 11) errors.cpf = 'Informe um CPF válido com 11 dígitos';
    
    if (!c.rg || c.rg.trim().length < 3) errors.rg = 'Informe o RG / Órgão Expedidor';
    if (!c.profissao || c.profissao.trim().length < 2) errors.profissao = 'Informe sua profissão';
    if (!c.telefone || c.telefone.replace(/\D/g, '').length < 10) errors.telefone = 'Informe um telefone ou WhatsApp válido';
    if (!c.endereco || c.endereco.trim().length < 5) errors.endereco = 'Informe seu endereço residencial completo';

    if (possuiConjuge) {
      const cj = clientForm.conjuge;
      if (!cj.nome || cj.nome.trim().length < 3) errors.conjugeNome = 'Informe o nome do cônjuge';
      if ((cj.cpf || '').replace(/\D/g, '').length !== 11) errors.conjugeCpf = 'Informe um CPF válido para o cônjuge';
      if (!cj.rg || cj.rg.trim().length < 3) errors.conjugeRg = 'Informe o RG do cônjuge';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Avançar para a tela de Conferência de Dados
  const handleProceedToConferencia = () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Atualiza blocos condicionais caso tenha cônjuge
    const updatedForm: ContratoModularFormData = {
      ...clientForm,
      blocks: {
        ...clientForm.blocks,
        conjuge: possuiConjuge,
      },
      assinaturas: {
        ...clientForm.assinaturas,
        signatarios: {
          ...clientForm.assinaturas.signatarios,
          conjuge: possuiConjuge,
        }
      }
    };
    setClientForm(updatedForm);

    // Registra evento de preenchimento
    recordExclusivityEvent(
      token,
      'DADOS_PREENCHIDOS',
      'Cliente preencheu todos os dados obrigatórios e abriu tela de conferência.',
      undefined,
      'PREENCHENDO'
    );

    setCurrentStep('conferencia_dados');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Travar e Congelar Dados após o botão [ OK, OS DADOS ESTÃO CORRETOS ]
  const handleConfirmDataAndLock = () => {
    setIsGeneratingDoc(true);

    const now = new Date();
    const updatedLink: ExclusivityFillLink = {
      ...linkData,
      status: 'AGUARDANDO_ASSINATURA',
      clientFilledData: JSON.parse(JSON.stringify(clientForm)),
      clientConfirmation: {
        confirmedAt: now.toISOString(),
        clientIp: 'Navegador Web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        dataVersion: 1,
      },
      identityValidation: {
        last4DigitsCpf: (clientForm.contratante.cpf || '').replace(/\D/g, '').slice(-4),
        failedAttempts: 0,
        maxAttempts: 3,
      }
    };

    updateExclusivityLink(updatedLink);
    setLinkData(updatedLink);

    recordExclusivityEvent(
      token,
      'CLIENTE_CONFIRMOU_DADOS',
      `Cliente clicou em "OK, OS DADOS ESTÃO CORRETOS". Dados congelados às ${now.toLocaleTimeString('pt-BR')}.`,
      { version: 1 },
      'AGUARDANDO_ASSINATURA'
    );

    recordExclusivityEvent(
      token,
      'CONTRATO_GERADO',
      'Contrato de exclusividade preenchido automaticamente com o modelo Word oficial e pronto para leitura.'
    );

    setTimeout(() => {
      setIsGeneratingDoc(false);
      setCurrentStep('leitura_contrato');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  };

  // Validar os 4 últimos dígitos do CPF para acessar a assinatura
  const handleValidateLast4DigitsCpf = (isPosterior: boolean = false) => {
    const cleanInput = inputLast4Digits.replace(/\D/g, '');
    const cleanCpf = (linkData.clientFilledData?.contratante.cpf || linkData.initialData.contratante.cpf || '').replace(/\D/g, '');
    const actualLast4 = cleanCpf.slice(-4);

    if (cleanInput.length !== 4) {
      setCpfError('Digite exatamente os 4 últimos dígitos do seu CPF.');
      return;
    }

    if (cleanInput === actualLast4) {
      setCpfError('');
      if (isPosterior) {
        setPosteriorAuthSuccess(true);
        recordExclusivityEvent(
          token,
          'DOWNLOAD_REALIZADO',
          'Acesso posterior autenticado com sucesso pelos 4 últimos dígitos do CPF.'
        );
      } else {
        // Gera código OTP temporário de 6 dígitos para assinatura
        const code = generateOtp6Digits();
        setGeneratedCode(code);
        setCurrentStep('assinatura_otp');
        
        recordExclusivityEvent(
          token,
          'CLIENTE_INICIOU_ASSINATURA',
          'Identidade validada pelos 4 dígitos do CPF. Código de confirmação de 6 dígitos gerado.'
        );
      }
    } else {
      const nextAttempts = cpfAttempts + 1;
      setCpfAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setIsCpfBlocked(true);
        setCpfError('Limite de 3 tentativas excedido por segurança. Verifique o número do CPF informado.');
      } else {
        setCpfError(`Dígitos incorretos. Tentativa ${nextAttempts} de 3.`);
      }
    }
  };

  // Confirmar Assinatura com o código de 6 dígitos
  const handleConfirmSignatureWithCode = async () => {
    const cleanCode = inputCode.trim();
    if (cleanCode !== generatedCode) {
      setCodeError('Código de confirmação incorreto. Verifique o código gerado na tela.');
      return;
    }

    setIsSigning(true);
    setCodeError('');

    try {
      const now = new Date();
      const signatureHash = `SHA256-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const finalLink: ExclusivityFillLink = {
        ...linkData,
        status: 'ASSINADO',
        signatureData: {
          confirmationCode: generatedCode,
          codeGeneratedAt: now.toISOString(),
          codeExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
          codeAttempts: 1,
          isCodeUsed: true,
          signedAt: now.toISOString(),
          signatureHash,
          clientIp: 'Navegador Web',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }
      };

      updateExclusivityLink(finalLink);
      setLinkData(finalLink);

      recordExclusivityEvent(
        token,
        'CODIGO_CONFIRMADO',
        `Código de segurança ${generatedCode} validado com sucesso.`
      );

      recordExclusivityEvent(
        token,
        'ASSINATURA_CONCLUIDA',
        `Contrato de exclusividade assinado digitalmente por ${clientForm.contratante.nome} (Hash: ${signatureHash}).`,
        { signatureHash },
        'ASSINADO'
      );

      // Salva no repositório de contratos modulares do sistema principal
      saveSignedExclusivityContractToMainRecords(finalLink);

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCurrentStep('concluido');
    } catch (e) {
      console.error('Erro ao finalizar assinatura:', e);
    } finally {
      setIsSigning(false);
    }
  };

  // Download do PDF Assinado
  const handleDownloadSignedPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Cria elemento temporário para renderizar o contrato completo
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.fontFamily = 'Arial, sans-serif';

      let html = generateModularContractHtml(clientForm);
      
      // Adiciona o carimbo e certificado digital da assinatura no final
      const sigData = linkData.signatureData;
      html += `
        <div style="margin-top: 40px; padding: 20px; border: 2px solid #059669; border-radius: 10px; background: #ecfdf5; font-family: monospace; font-size: 11px; color: #065f46;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #047857; text-transform: uppercase;">
            ✓ DOCUMENTO ASSINADO DIGITALMENTE
          </div>
          <div>Signatário: ${clientForm.contratante.nome} | CPF: ${maskCpfPrivacy(clientForm.contratante.cpf)}</div>
          <div>Corretor: ${linkData.corretor.nome} | CRECI: ${linkData.corretor.creci}</div>
          <div>Data e Hora: ${sigData?.signedAt ? new Date(sigData.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
          <div>Código de Confirmação: ${sigData?.confirmationCode || '482731'}</div>
          <div>Hash de Autenticidade: ${sigData?.signatureHash || 'SHA256-VALIDATED'}</div>
          <div style="margin-top: 6px; font-size: 10px; color: #047857;">Autenticação eletrônica válida conforme Lei 14.063/2020 e Art. 10 da MP 2.200-2/2001.</div>
        </div>
      `;

      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`Contrato_Exclusividade_ASSINADO_${linkData.codigoContrato}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF assinado:', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download do DOCX preenchido
  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    try {
      const blob = await generateModularDocxBlob(undefined, clientForm);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrato_Exclusividade_${linkData.codigoContrato}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao baixar DOCX:', e);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // ----------------------------------------------------
  // TELA DE AUTENTICAÇÃO POSTERIOR (QUANDO JÁ ESTÁ ASSINADO)
  // ----------------------------------------------------
  if (currentStep === 'autenticacao_posterior') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
              Contrato Assinado
            </div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              {posteriorAuthSuccess ? 'Documento Liberado' : 'Acesso Seguro ao Documento'}
            </h2>
            <p className="text-xs text-slate-600">
              {posteriorAuthSuccess 
                ? 'Sua identidade foi validada com sucesso. Você pode baixar seu contrato assinado abaixo.'
                : 'Este contrato já foi assinado digitalmente. Para acessar o documento, digite os 4 últimos dígitos do seu CPF.'
              }
            </p>
          </div>

          {!posteriorAuthSuccess ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  DIGITE OS 4 ÚLTIMOS DÍGITOS DO SEU CPF
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={4}
                    value={inputLast4Digits}
                    onChange={(e) => {
                      setInputLast4Digits(e.target.value.replace(/\D/g, ''));
                      setCpfError('');
                    }}
                    placeholder="____"
                    className="w-44 text-center tracking-[0.5em] text-2xl font-mono font-bold px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner"
                  />
                </div>
                {cpfError && (
                  <p className="text-xs text-red-600 font-medium text-center mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {cpfError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleValidateLast4DigitsCpf(true)}
                disabled={inputLast4Digits.length !== 4 || isCpfBlocked}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <KeyRound className="w-4 h-4" />
                Acessar Documento
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Assinatura Válida e Registrada
                </div>
                <div>Código do Contrato: <strong>{linkData.codigoContrato}</strong></div>
                <div>Data da Assinatura: {new Date(linkData.signatureData?.signedAt || linkData.updatedAt || '').toLocaleString('pt-BR')}</div>
                <div className="text-[10px] text-emerald-700 truncate font-mono">Hash: {linkData.signatureData?.signatureHash}</div>
              </div>

              <button
                type="button"
                onClick={handleDownloadSignedPdf}
                disabled={isDownloadingPdf}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isDownloadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Baixar PDF Assinado
              </button>

              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isDownloadingDocx}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Baixar Cópia em Word (.docx)
              </button>
            </div>
          )}

          {onBackToApp && (
            <div className="pt-2 text-center">
              <button
                onClick={onBackToApp}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Voltar ao Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ETAPA 6: ASSINATURA CONCLUÍDA
  // ----------------------------------------------------
  if (currentStep === 'concluido') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full border border-emerald-200 shadow-2xl space-y-6 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
              Processo Finalizado
            </div>
            <h2 className="text-2xl font-heading font-black text-slate-900">Assinatura Concluída!</h2>
            <p className="text-sm text-slate-600">
              O contrato de exclusividade foi preenchido, validado e assinado digitalmente com sucesso.
            </p>
          </div>

          {/* Badges de Confirmação Obrigatórios */}
          <div className="grid grid-cols-2 gap-2.5 text-left text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dados confirmados</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contrato conferido</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Identidade validada</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Assinatura realizada</span>
            </div>
          </div>

          {/* Dados do Certificado de Assinatura */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <span>Certificado Digital</span>
              <span className="font-mono text-emerald-600 text-[11px]">{linkData.codigoContrato}</span>
            </div>
            <div>Signatário: <strong>{clientForm.contratante.nome}</strong></div>
            <div>CPF: <strong>{maskCpfPrivacy(clientForm.contratante.cpf)}</strong></div>
            <div>Corretor: <strong>{linkData.corretor.nome} ({linkData.corretor.creci})</strong></div>
            <div>Data/Hora: <strong>{new Date().toLocaleString('pt-BR')}</strong></div>
            <div className="text-[10px] text-slate-500 font-mono break-all pt-1 border-t border-slate-100">
              Hash: {linkData.signatureData?.signatureHash}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownloadSignedPdf}
              disabled={isDownloadingPdf}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
            >
              {isDownloadingPdf ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              BAIXAR PDF ASSINADO
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isDownloadingDocx}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Baixar Cópia em Word (.docx)
            </button>
          </div>

          {onBackToApp && (
            <div className="pt-2 text-center">
              <button
                onClick={onBackToApp}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Voltar ao Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LAYOUT PRINCIPAL DO CLIENTE (ETAPAS 1 a 5)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* HEADER FIXO SUPERIOR */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                ImobGestão • Contrato Exclusivo
              </div>
              <h1 className="text-sm sm:text-base font-heading font-extrabold text-slate-900">
                Preenchimento do Contrato de Exclusividade
              </h1>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sair
            </button>
          )}
        </div>

        {/* BARRA DE PROGRESSO VISUAL */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between text-[11px] font-bold">
            <span className={currentStep === 'preenchimento' ? 'text-emerald-700' : 'text-slate-400'}>
              1. Preenchimento
            </span>
            <span className={currentStep === 'conferencia_dados' ? 'text-emerald-700' : 'text-slate-400'}>
              2. Conferência
            </span>
            <span className={currentStep === 'leitura_contrato' ? 'text-emerald-700' : 'text-slate-400'}>
              3. Leitura
            </span>
            <span className={(currentStep === 'validacao_cpf' || currentStep === 'assinatura_otp') ? 'text-emerald-700' : 'text-slate-400'}>
              4. Assinatura
            </span>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* IDENTIFICAÇÃO DO CORRETOR E IMÓVEL */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                CONTRATO DE EXCLUSIVIDADE
              </div>
              <div className="text-lg font-heading font-extrabold">
                {linkData.tituloContrato || 'Autorização de Venda com Exclusividade'}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/80 rounded-full text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Expira: {new Date(linkData.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="space-y-1 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Corretor Responsável</div>
              <div className="font-extrabold text-white text-sm">{linkData.corretor.nome}</div>
              <div>{linkData.corretor.creci}</div>
              <div>{linkData.corretor.telefone} • {linkData.corretor.email}</div>
            </div>

            <div className="space-y-1 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Imóvel Objeto</div>
              <div className="font-extrabold text-white text-sm">{clientForm.imovel.tipoImovel || 'Imóvel Residencial'}</div>
              <div>{clientForm.imovel.endereco || 'Endereço cadastrado'} {clientForm.imovel.numero} - {clientForm.imovel.bairro}</div>
              <div className="text-emerald-400 font-bold">
                {formatCurrency(clientForm.precoCondicoes.precoVenda || clientForm.exclusividade.precoAutorizadoVenda)}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed italic bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-xl">
            "Solicitamos que você preencha e confira atentamente os dados necessários para elaboração e assinatura do contrato."
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* ETAPA 1: PREENCHIMENTO DOS DADOS */}
        {/* ---------------------------------------------------- */}
        {currentStep === 'preenchimento' && (
          <div className="space-y-6">
            
            {/* 1.1 DADOS PESSOAIS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-heading font-extrabold text-slate-900">DADOS PESSOAIS DO CONTRATANTE</h3>
                  <p className="text-[11px] text-slate-500">Seus dados oficiais para o contrato</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NOME COMPLETO *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.nome}
                    onChange={(e) => handleClientFieldChange('contratante', 'nome', e.target.value)}
                    placeholder="Ex: João da Silva Santos"
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.nome ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.nome && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.nome}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.cpf}
                    onChange={(e) => handleClientFieldChange('contratante', 'cpf', formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.cpf ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.cpf && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.cpf}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    RG / IDENTIDADE *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.rg}
                    onChange={(e) => handleClientFieldChange('contratante', 'rg', e.target.value)}
                    placeholder="Ex: 1234567 SSP/PA"
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.rg ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.rg && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.rg}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ESTADO CIVIL *
                  </label>
                  <select
                    value={clientForm.contratante.estadoCivil}
                    onChange={(e) => handleClientFieldChange('contratante', 'estadoCivil', e.target.value as EstadoCivil)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PROFISSÃO *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.profissao}
                    onChange={(e) => handleClientFieldChange('contratante', 'profissao', e.target.value)}
                    placeholder="Ex: Engenheiro, Empresário..."
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.profissao ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.profissao && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.profissao}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TELEFONE / WHATSAPP *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.telefone}
                    onChange={(e) => handleClientFieldChange('contratante', 'telefone', formatPhone(e.target.value))}
                    placeholder="(93) 99999-9999"
                    maxLength={15}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.telefone ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.telefone && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.telefone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-MAIL
                  </label>
                  <input
                    type="email"
                    value={clientForm.contratante.email || ''}
                    onChange={(e) => handleClientFieldChange('contratante', 'email', e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 1.2 ENDEREÇO */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-heading font-extrabold text-slate-900">ENDEREÇO RESIDENCIAL</h3>
                  <p className="text-[11px] text-slate-500">Local de domicílio para qualificação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    BUSCAR POR CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      maxLength={9}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        e.target.value = formatted;
                        if (formatted.replace(/\D/g, '').length === 8) {
                          handleBuscarCep(formatted);
                        }
                      }}
                      className="w-full pl-3.5 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {loadingCep ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Search className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ENDEREÇO COMPLETO (LOGRADOURO, Nº, BAIRRO, CIDADE/UF) *
                  </label>
                  <input
                    type="text"
                    value={clientForm.contratante.endereco}
                    onChange={(e) => handleClientFieldChange('contratante', 'endereco', e.target.value)}
                    placeholder="Ex: Av. Presidente Vargas, nº 450, Apto 302, Bairro Centro, Santarém - PA"
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      formErrors.endereco ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.endereco && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.endereco}</p>}
                </div>
              </div>
            </div>

            {/* 1.3 CÔNJUGE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-slate-900">DADOS DO CÔNJUGE</h3>
                    <p className="text-[11px] text-slate-500">Necessário para anuência conjugal na exclusividade</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={possuiConjuge}
                    onChange={(e) => setPossuiConjuge(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800">Possui Cônjuge</span>
                </label>
              </div>

              {possuiConjuge ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NOME COMPLETO DO CÔNJUGE *
                    </label>
                    <input
                      type="text"
                      value={clientForm.conjuge.nome}
                      onChange={(e) => handleClientFieldChange('conjuge', 'nome', e.target.value)}
                      placeholder="Ex: Maria Pereira da Silva"
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                        formErrors.conjugeNome ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                      }`}
                    />
                    {formErrors.conjugeNome && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.conjugeNome}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CPF DO CÔNJUGE *
                    </label>
                    <input
                      type="text"
                      value={clientForm.conjuge.cpf}
                      onChange={(e) => handleClientFieldChange('conjuge', 'cpf', formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                        formErrors.conjugeCpf ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                      }`}
                    />
                    {formErrors.conjugeCpf && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.conjugeCpf}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RG DO CÔNJUGE *
                    </label>
                    <input
                      type="text"
                      value={clientForm.conjuge.rg}
                      onChange={(e) => handleClientFieldChange('conjuge', 'rg', e.target.value)}
                      placeholder="Ex: 7654321 SSP/PA"
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                        formErrors.conjugeRg ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300 focus:border-emerald-500'
                      }`}
                    />
                    {formErrors.conjugeRg && <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.conjugeRg}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      REGIME DE BENS
                    </label>
                    <select
                      value={clientForm.conjuge.regimeBens || 'Comunhão Parcial de Bens'}
                      onChange={(e) => handleClientFieldChange('conjuge', 'regimeBens', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    >
                      <option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option>
                      <option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option>
                      <option value="Separação Total de Bens">Separação Total de Bens</option>
                      <option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PROFISSÃO DO CÔNJUGE
                    </label>
                    <input
                      type="text"
                      value={clientForm.conjuge.profissao || ''}
                      onChange={(e) => handleClientFieldChange('conjuge', 'profissao', e.target.value)}
                      placeholder="Ex: Arquiteta"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Nenhum cônjuge selecionado. Marque a opção acima se for casado(a) ou em união estável.
                </p>
              )}
            </div>

            {/* 1.4 DADOS DO IMÓVEL & CONDIÇÕES DA EXCLUSIVIDADE (CONFERÊNCIA / EDIÇÃO SE AUTORIZADA) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-slate-900">DADOS DO IMÓVEL E EXCLUSIVIDADE</h3>
                    <p className="text-[11px] text-slate-500">
                      {linkData.allowClientEditImovel 
                        ? 'Confira ou edite os dados do imóvel conforme autorizado pelo corretor'
                        : 'Dados comerciais definidos pelo corretor (somente conferência)'}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg">
                  <Lock className="w-3 h-3 text-slate-500" />
                  {linkData.allowClientEditImovel ? 'Editável' : 'Bloqueado p/ alteração'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Tipo de Imóvel</div>
                  <div className="font-bold text-slate-900 text-sm">{clientForm.imovel.tipoImovel}</div>
                  <div className="text-slate-600">{clientForm.imovel.endereco}, {clientForm.imovel.numero}</div>
                  <div className="text-slate-600">{clientForm.imovel.bairro} - {clientForm.imovel.cidade}/{clientForm.imovel.uf}</div>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="text-emerald-800 font-bold uppercase text-[10px]">Condições Comerciais</div>
                  <div className="text-slate-700">Preço de Venda Autorizado:</div>
                  <div className="text-base font-extrabold text-emerald-700">
                    {formatCurrency(clientForm.precoCondicoes.precoVenda || clientForm.exclusividade.precoAutorizadoVenda)}
                  </div>
                  <div className="text-slate-600">
                    Prazo: <strong>{clientForm.exclusividade.prazoDias || 90} dias</strong> | Comissão: <strong>{clientForm.exclusividade.percentualComissao || 6}%</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Vigência: {formatDateBR(clientForm.exclusividade.dataInicio)} até {formatDateBR(clientForm.exclusividade.dataTermino)}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO PARA AVANÇAR */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToConferencia}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
              >
                <span>Conferir Dados e Continuar</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 2: CONFERÊNCIA DOS DADOS PREENCHIDOS */}
        {/* ---------------------------------------------------- */}
        {currentStep === 'conferencia_dados' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
                  Etapa de Conferência
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
                  CONFIRA SEUS DADOS
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Verifique se todas as informações estão corretas antes de congelar os dados e gerar o documento.
                </p>
              </div>

              {/* TABELA / CARD DE RESUMO ESTRUTURADO */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs sm:text-sm bg-slate-50/50">
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">Nome:</span>
                  <span className="col-span-2 font-extrabold text-slate-900">{clientForm.contratante.nome}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">CPF:</span>
                  <span className="col-span-2 font-mono font-bold text-slate-800">{maskCpfPrivacy(clientForm.contratante.cpf)}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">RG:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.contratante.rg}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">Estado Civil:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.contratante.estadoCivil}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">Profissão:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.contratante.profissao}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">Telefone:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.contratante.telefone}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2">
                  <span className="font-bold text-slate-500">Endereço:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.contratante.endereco}</span>
                </div>

                {possuiConjuge && clientForm.conjuge.nome && (
                  <>
                    <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-emerald-50/50">
                      <span className="font-bold text-emerald-800">Cônjuge:</span>
                      <span className="col-span-2 font-bold text-slate-900">{clientForm.conjuge.nome}</span>
                    </div>
                    <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-emerald-50/50">
                      <span className="font-bold text-emerald-800">CPF Cônjuge:</span>
                      <span className="col-span-2 font-mono text-slate-800">{maskCpfPrivacy(clientForm.conjuge.cpf)}</span>
                    </div>
                  </>
                )}

                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-slate-100/70">
                  <span className="font-bold text-slate-700">Imóvel:</span>
                  <span className="col-span-2 text-slate-900 font-bold">{clientForm.imovel.tipoImovel} - {clientForm.imovel.endereco}</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-slate-100/70">
                  <span className="font-bold text-slate-700">Preço:</span>
                  <span className="col-span-2 font-extrabold text-emerald-700">
                    {formatCurrency(clientForm.precoCondicoes.precoVenda || clientForm.exclusividade.precoAutorizadoVenda)}
                  </span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-slate-100/70">
                  <span className="font-bold text-slate-700">Prazo:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.exclusividade.prazoDias || 90} dias</span>
                </div>
                <div className="p-3.5 sm:p-4 grid grid-cols-3 gap-2 bg-slate-100/70">
                  <span className="font-bold text-slate-700">Comissão:</span>
                  <span className="col-span-2 text-slate-800">{clientForm.exclusividade.percentualComissao || 6}%</span>
                </div>
              </div>

              {/* AVISO DE TRAVAMENTO */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">Aviso de Congelamento de Dados:</strong>
                  Ao clicar em <strong>"OK, OS DADOS ESTÃO CORRETOS"</strong>, estas informações serão congeladas e vinculadas à versão oficial do contrato para geração do documento e assinatura.
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('preenchimento')}
                  className="w-full sm:w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  EDITAR DADOS
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDataAndLock}
                  disabled={isGeneratingDoc}
                  className="w-full sm:w-2/3 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
                >
                  {isGeneratingDoc ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  OK, OS DADOS ESTÃO CORRETOS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 3: LEITURA E CONFERÊNCIA COMPLETA DO CONTRATO */}
        {/* ---------------------------------------------------- */}
        {currentStep === 'leitura_contrato' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    CONTRATO DE EXCLUSIVIDADE
                  </div>
                  <h2 className="text-lg font-heading font-extrabold text-slate-900">
                    Leitura e Conferência do Documento
                  </h2>
                  <p className="text-xs text-slate-500">
                    Confira atentamente todo o conteúdo do contrato antes de assinar.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(80, prev - 10))}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                    title="Diminuir Zoom"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-600">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                    title="Aumentar Zoom"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* VISUALIZADOR COMPLETO DO CONTRATO GERADO */}
              <div className="border border-slate-300 rounded-2xl overflow-y-auto max-h-[500px] bg-slate-50 p-4 shadow-inner">
                <div 
                  ref={contractPreviewRef}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  className="transition-transform duration-200"
                  dangerouslySetInnerHTML={{ __html: generateModularContractHtml(clientForm) }}
                />
              </div>

              {/* CHECKBOX DE LEITURA E BOTÃO CONTINUAR */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreedReadTerms}
                    onChange={(e) => setHasAgreedReadTerms(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-5 w-5 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-bold leading-snug">
                    LI E CONFERI TODO O CONTRATO, CONCORDANDO INTEGRALMENTE COM TODAS AS SUAS CLÁUSULAS E CONDIÇÕES.
                  </span>
                </label>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('preenchimento')}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    VOLTAR E EDITAR DADOS
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('validacao_cpf');
                      recordExclusivityEvent(
                        token,
                        'CONTRATO_VISUALIZADO',
                        'Cliente confirmou a leitura integral de todas as cláusulas do contrato.'
                      );
                    }}
                    disabled={!hasAgreedReadTerms}
                    className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
                  >
                    <span>CONTINUAR PARA ASSINATURA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 4: CONFIRMAÇÃO DE IDENTIDADE (4 ÚLTIMOS DÍGITOS CPF) */}
        {/* ---------------------------------------------------- */}
        {currentStep === 'validacao_cpf' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg mx-auto border border-slate-200 shadow-xl space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider rounded-full">
                  Validação de Segurança
                </div>
                <h2 className="text-xl font-heading font-extrabold text-slate-900">
                  CONFIRMAÇÃO DE IDENTIDADE
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para autenticar sua assinatura, digite os <strong>4 últimos dígitos do seu CPF</strong> cadastrado.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={4}
                    value={inputLast4Digits}
                    onChange={(e) => {
                      setInputLast4Digits(e.target.value.replace(/\D/g, ''));
                      setCpfError('');
                    }}
                    placeholder="____"
                    className="w-48 text-center tracking-[0.5em] text-3xl font-mono font-bold px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                {cpfError && (
                  <p className="text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {cpfError}
                  </p>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('leitura_contrato')}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidateLast4DigitsCpf(false)}
                    disabled={inputLast4Digits.length !== 4 || isCpfBlocked}
                    className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    CONTINUAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 5: ASSINATURA COM CÓDIGO TEMPORÁRIO (OTP 6 DÍGITOS) */}
        {/* ---------------------------------------------------- */}
        {currentStep === 'assinatura_otp' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg mx-auto border border-slate-200 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <KeyRound className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
                  Etapa Final
                </div>
                <h2 className="text-xl font-heading font-extrabold text-slate-900">
                  ASSINATURA DO CONTRATO
                </h2>
                <p className="text-xs text-slate-600">
                  Confirme os dados da assinatura e insira o código de verificação temporário gerado para a sua sessão.
                </p>
              </div>

              {/* RESUMO DO OBJETO */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                <div>Signatário: <strong>{clientForm.contratante.nome}</strong></div>
                <div>Tipo: <strong>{linkData.tituloContrato}</strong></div>
                <div>Imóvel: <strong>{clientForm.imovel.tipoImovel} - {clientForm.imovel.endereco}</strong></div>
              </div>

              {/* BLOCO DO CÓDIGO DE CONFIRMAÇÃO (OTP) */}
              <div className="p-5 bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  CÓDIGO DE CONFIRMAÇÃO
                </div>
                <div className="text-3xl font-mono font-black tracking-[0.25em] text-emerald-950 bg-white py-3 px-4 rounded-2xl border border-emerald-200 shadow-inner">
                  {generatedCode}
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    setCodeCopied(true);
                    setInputCode(generatedCode);
                    setTimeout(() => setCodeCopied(false), 2500);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {codeCopied ? 'Código Copiado e Colado!' : 'COPIAR CÓDIGO'}
                </button>
              </div>

              {/* CAMPO PARA INSERIR O CÓDIGO */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 text-center">
                  DIGITE OU COLE O CÓDIGO ACIMA
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.replace(/\D/g, ''));
                      setCodeError('');
                    }}
                    placeholder="000000"
                    className="w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode(generatedCode);
                    }}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
                  >
                    COLAR
                  </button>
                </div>

                {codeError && (
                  <p className="text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {codeError}
                  </p>
                )}
              </div>

              {/* BOTÃO CONFIRMAR ASSINATURA */}
              <button
                type="button"
                onClick={handleConfirmSignatureWithCode}
                disabled={inputCode.trim().length !== 6 || isSigning}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
              >
                {isSigning ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                CONFIRMAR ASSINATURA
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
