import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Eraser, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Type, 
  Pen, 
  FileCheck2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SaleRecord, SignatureParty } from '../types';
import { generateVerificationHash } from '../utils/formatters';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord;
  onSaveSignature: (updatedSale: SaleRecord) => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaveSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | 'witness1' | 'witness2'>('buyer');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(sale.buyer.nome);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  useEffect(() => {
    if (selectedRole === 'buyer') {
      setTypedName(sale.buyer.nome);
    } else if (selectedRole === 'seller') {
      setTypedName(sale.seller.vendedorNome);
    } else if (selectedRole === 'witness1') {
      setTypedName(sale.signatures.witness1?.name || '1ª Testemunha');
    } else {
      setTypedName(sale.signatures.witness2?.name || '2ª Testemunha');
    }
    clearCanvas();
  }, [selectedRole, sale]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(initCanvas, 100);
    }
  }, [isOpen, mode]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateSignatureImage = (): string => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    } else {
      // Criar imagem estilizada de texto
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 600;
      tempCanvas.height = 180;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.font = 'italic bold 34px "Segoe UI", cursive, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName || 'Assinatura', 300, 90);

      return tempCanvas.toDataURL('image/png');
    }
  };

  const handleConfirmSignature = () => {
    const signatureImage = generateSignatureImage();
    const now = new Date().toISOString();
    const verificationHash = generateVerificationHash(`${sale.id}-${selectedRole}-${now}`);

    const roleName: SignatureParty['role'] = selectedRole === 'buyer' 
      ? 'Comprador(a)' 
      : selectedRole === 'seller' 
      ? 'Corretor(a) / Vendedor(a)' 
      : selectedRole === 'witness1'
      ? 'Testemunha 1'
      : 'Testemunha 2';

    const currentPartyInfo: SignatureParty = {
      name: selectedRole === 'buyer' ? sale.buyer.nome : selectedRole === 'seller' ? sale.seller.vendedorNome : typedName,
      role: roleName,
      documentNumber: selectedRole === 'buyer' ? sale.buyer.cpf : selectedRole === 'seller' ? `CRECI ${sale.seller.vendedorCreci}` : 'Documento Registrado',
      signatureImage,
      signedAt: now,
      ipAddress: '187.54.120.91 (Autenticado)',
      authMethod: 'Assinatura Eletrônica na Tela',
    };

    const updatedSignatures = { ...sale.signatures, contractHash: verificationHash };

    if (selectedRole === 'buyer') {
      updatedSignatures.buyer = currentPartyInfo;
    } else if (selectedRole === 'seller') {
      updatedSignatures.seller = currentPartyInfo;
    } else if (selectedRole === 'witness1') {
      updatedSignatures.witness1 = currentPartyInfo;
    } else {
      updatedSignatures.witness2 = currentPartyInfo;
    }

    // Verifica se comprador e vendedor já assinaram
    const isFullySigned = !!(updatedSignatures.buyer.signatureImage && updatedSignatures.seller.signatureImage);
    updatedSignatures.isFullySigned = isFullySigned;

    const updatedSale: SaleRecord = {
      ...sale,
      status: isFullySigned ? 'assinado' : sale.status,
      signatures: updatedSignatures,
      updatedAt: now.split('T')[0],
    };

    onSaveSignature(updatedSale);

    // Efeito de celebração
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    onClose();
  };

  if (!isOpen) return null;

  const currentRoleSignature = selectedRole === 'buyer' 
    ? sale.signatures.buyer 
    : selectedRole === 'seller' 
    ? sale.signatures.seller 
    : selectedRole === 'witness1' 
    ? sale.signatures.witness1 
    : sale.signatures.witness2;

  const isAlreadySigned = !!currentRoleSignature?.signatureImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-extrabold text-slate-900">Autenticação & Assinatura Eletrônica</h2>
              <p className="text-xs text-slate-500 font-mono">
                Contrato: <span className="text-emerald-700 font-bold">{sale.codigoVenda}</span> ({sale.property.empreendimento})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* SELEÇÃO DO SIGNATÁRIO */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
              Selecione o Signatário da Assinatura:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('buyer')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  selectedRole === 'buyer'
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-300 hover:border-slate-400 text-slate-600 bg-slate-50'
                }`}
              >
                <span>Comprador(a)</span>
                {sale.signatures.buyer.signatureImage ? (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Assinado
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-mono font-semibold mt-0.5">Pendente</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('seller')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  selectedRole === 'seller'
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-300 hover:border-slate-400 text-slate-600 bg-slate-50'
                }`}
              >
                <span>Vendedor(a)</span>
                {sale.signatures.seller.signatureImage ? (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Assinado
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-mono font-semibold mt-0.5">Pendente</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('witness1')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  selectedRole === 'witness1'
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-300 hover:border-slate-400 text-slate-600 bg-slate-50'
                }`}
              >
                <span>Testemunha 1</span>
                {sale.signatures.witness1?.signatureImage ? (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Assinado
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">Opcional</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('witness2')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  selectedRole === 'witness2'
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-300 hover:border-slate-400 text-slate-600 bg-slate-50'
                }`}
              >
                <span>Testemunha 2</span>
                {sale.signatures.witness2?.signatureImage ? (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Assinado
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">Opcional</span>
                )}
              </button>
            </div>
          </div>

          {/* DADOS DO ASSINANTE */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
            <div>
              <p className="font-heading font-bold text-slate-900 text-sm">
                {selectedRole === 'buyer'
                  ? sale.buyer.nome
                  : selectedRole === 'seller'
                  ? sale.seller.vendedorNome
                  : typedName}
              </p>
              <p className="text-slate-500">
                {selectedRole === 'buyer'
                  ? `CPF: ${sale.buyer.cpf} (Adquirente)`
                  : selectedRole === 'seller'
                  ? `CRECI: ${sale.seller.vendedorCreci} (Corretor Responsável)`
                  : 'Testemunha da Transação'}
              </p>
            </div>
            {isAlreadySigned && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <FileCheck2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Assinatura Ativa
              </span>
            )}
          </div>

          {/* ESCOLHA ENTRE DESENHAR OU DIGITAR */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => setMode('draw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  mode === 'draw'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Pen className="w-3.5 h-3.5" />
                <span>Desenhar na Tela</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('type')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  mode === 'type'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Caligrafia Automática</span>
              </button>
            </div>

            {mode === 'draw' && (
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-rose-700 hover:text-rose-800 font-mono font-bold flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-300 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Limpar Traço</span>
              </button>
            )}
          </div>

          {/* ÁREA DE ASSINATURA */}
          <div className="relative">
            {mode === 'draw' ? (
              <div className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assine com o dedo ou mouse no quadro abaixo:</span>
                </div>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none bg-white"
                />
                <div className="border-t border-slate-200 px-4 py-1.5 bg-slate-50 text-center">
                  <div className="w-3/4 mx-auto border-b border-slate-300 mb-1"></div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    Linha de Assinatura Digital
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Nome Completo do Assinante"
                  className="w-full px-3.5 py-2.5 rounded-xl windows-input text-sm font-semibold text-slate-900"
                />
                <div className="border-2 border-slate-300 rounded-xl p-6 bg-white flex items-center justify-center min-h-[120px] shadow-xs">
                  <span className="font-serif italic text-3xl font-bold text-slate-900 tracking-wide text-center">
                    {typedName || 'Assinatura Jurídica'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* TERMOS DE ACEITE LEGAL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-relaxed font-sans">
                Declaro que li e concordo integralmente com os termos deste contrato, reconhecendo a 
                <strong className="text-slate-900"> validade jurídica da assinatura eletrônica</strong> nos termos da MP nº 2.200-2/2001 e Lei nº 14.063/2020.
              </span>
            </label>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btn-confirm-signature"
            onClick={handleConfirmSignature}
            disabled={!acceptedTerms || (mode === 'draw' && !hasDrawn && !isAlreadySigned)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer border border-emerald-600"
          >
            <Check className="w-4 h-4" />
            <span>Salvar e Autenticar Assinatura</span>
          </button>
        </div>
      </div>
    </div>
  );
};
