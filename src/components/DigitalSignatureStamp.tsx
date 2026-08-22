import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface DigitalSignatureStampData {
  status?: string;
  tipo?: string;
  validade?: string;
  assinante?: string;
  cpf?: string;
  data?: string;
  hora?: string;
  id?: string;
  hash?: string;
  integridade?: string;
  qrCodeUrl?: string;
  validationUrl?: string;
  roleLabel?: string;
}

export interface DigitalSignatureStampProps extends DigitalSignatureStampData {
  className?: string;
  id?: string;
}

export const DigitalSignatureStamp: React.FC<DigitalSignatureStampProps> = ({
  status = 'ASSINADO',
  tipo = 'ELETRONICAMENTE',
  validade = 'COM VALIDADE JURÍDICA',
  assinante = 'Rafael Tavares Matos',
  cpf = '***.***.***-**',
  data = '22/08/2026',
  hora = '17:42:18',
  id = '8F4A-92C1-7B35-4D81',
  hash = '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F',
  integridade = 'VERIFICADA',
  qrCodeUrl,
  validationUrl,
  roleLabel,
  className = '',
}) => {
  const [generatedQr, setGeneratedQr] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const targetUrl = qrCodeUrl || validationUrl || (typeof window !== 'undefined' ? `${window.location.origin}/validar/${id}` : `https://imobgestao.com.br/validar/${id}`);

    if (targetUrl.startsWith('data:image')) {
      setGeneratedQr(targetUrl);
    } else {
      QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 140,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => {
          if (isMounted) setGeneratedQr(url);
        })
        .catch((err) => {
          console.error('Erro ao gerar QR Code para o carimbo:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [qrCodeUrl, validationUrl, id]);

  return (
    <div
      id={`stamp-${id.replace(/\s+/g, '-').toLowerCase()}`}
      className={`digital-signature-stamp font-sans bg-white text-[#111111] rounded-xl border-2 border-[#063B73] shadow-xs select-none max-w-4xl w-full overflow-hidden ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(6, 59, 115, 0.08)',
      }}
    >
      {/* CORPO SUPERIOR: DISTRIBUIÇÃO HORIZONTAL */}
      <div className="flex flex-col lg:flex-row items-stretch">
        
        {/* BLOCO 1 — ESCUDO (EXTREMO ESQUERDO) */}
        <div
          className="bg-[#063B73] text-white flex flex-col items-center justify-between p-3.5 lg:w-24 shrink-0 relative overflow-hidden"
          style={{
            borderRight: '1px solid #0B2F5B',
          }}
        >
          <div className="w-full flex flex-col items-center my-auto">
            {/* ESCUDO COM CHECK VERDE */}
            <div className="relative w-12 h-14 flex items-center justify-center">
              <svg
                viewBox="0 0 48 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xs"
              >
                {/* Contorno externo do escudo branco */}
                <path
                  d="M24 2L4 9.5V26.5C4 40.5 24 53 24 53C24 53 44 40.5 44 26.5V9.5L24 2Z"
                  fill="#FFFFFF"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* Contorno interno do escudo em azul */}
                <path
                  d="M24 6L8 12.5V26.5C8 38 24 48.5 24 48.5C24 48.5 40 38 40 26.5V12.5L24 6Z"
                  fill="#063B73"
                />
                {/* Check verde no centro */}
                <path
                  d="M17 26L22 31L31 20"
                  stroke="#18A957"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* DETALHE GRÁFICO DISCRETO NA PARTE INFERIOR */}
          <div className="w-full flex items-center justify-center space-x-1 opacity-60 pt-2 border-t border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18A957]"></span>
            <span className="w-4 h-0.5 bg-white/60"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
        </div>

        {/* BLOCO 2 — STATUS DA ASSINATURA */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 lg:w-60 shrink-0 bg-white">
          <div>
            {roleLabel && (
              <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 mb-1 bg-slate-100 text-[#063B73] rounded border border-slate-300">
                {roleLabel}
              </span>
            )}
            <div className="text-xl sm:text-2xl font-black tracking-tight text-[#063B73] leading-none uppercase">
              {status}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#18A957] tracking-wider uppercase mt-0.5">
              {tipo}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-[#4A5568] tracking-wider uppercase mt-1">
              {validade}
            </div>
          </div>

          {/* BLOCO JURÍDICO AZUL-MARINHO */}
          <div className="mt-3 bg-[#063B73] text-white rounded-lg p-2 flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {/* ÍCONE JURÍDICO CIRCULAR (BALANÇA ⚖) */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-white"
              >
                <path d="M12 3v17" />
                <path d="M5 7h14" />
                <path d="M3 13l3-6 3 6a3 3 0 0 1-6 0Z" />
                <path d="M15 13l3-6 3 6a3 3 0 0 1-6 0Z" />
                <path d="M9 21h6" />
              </svg>
            </div>
            <div className="text-[9px] font-bold leading-tight font-mono">
              <div>MP 2.200-2/2001</div>
              <div className="text-emerald-300">LEI 14.063/2020</div>
            </div>
          </div>
        </div>

        {/* BLOCO 3 & 4 — ASSINANTE & INFORMAÇÕES DA ASSINATURA (REGIÃO CENTRAL) */}
        <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
          
          {/* BLOCO 3: DADOS DO ASSINANTE */}
          <div className="flex items-start space-x-3 pb-3">
            <div className="w-9 h-9 rounded-full bg-[#063B73] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              {/* ÍCONE CIRCULAR DE PESSOA */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-white"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#4A5568]">
                ASSINANTE
              </div>
              <div className="text-sm sm:text-base font-black text-[#111111] leading-tight truncate">
                {assinante}
              </div>
              <div className="text-[11px] font-mono text-[#4A5568] font-bold mt-0.5">
                CPF: {cpf}
              </div>
            </div>
          </div>

          {/* LINHA HORIZONTAL DIVISÓRIA */}
          <div className="w-full border-t border-slate-200 my-1"></div>

          {/* BLOCO 4: INFORMAÇÕES DA ASSINATURA (DATA, HORA, ID) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            
            {/* DATA */}
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-md bg-slate-100 text-[#063B73] shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-[#4A5568]">
                  DATA DA ASSINATURA
                </div>
                <div className="text-[11px] font-bold text-[#111111] font-mono">
                  {data}
                </div>
              </div>
            </div>

            {/* HORA */}
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-md bg-slate-100 text-[#063B73] shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-[#4A5568]">
                  HORA DA ASSINATURA
                </div>
                <div className="text-[11px] font-bold text-[#111111] font-mono">
                  {hora}
                </div>
              </div>
            </div>

            {/* ID DA ASSINATURA */}
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-md bg-slate-100 text-[#063B73] shrink-0">
                {/* ÍCONE DE IMPRESSÃO DIGITAL / BIOMETRIA */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                  <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                  <path d="M2 12a10 10 0 0 1 18-6" />
                  <path d="M2 16h.01" />
                  <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                  <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                  <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                  <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold uppercase tracking-wider text-[#4A5568]">
                  ID DA ASSINATURA
                </div>
                <div className="text-[11px] font-bold font-mono text-[#063B73] truncate" title={id}>
                  {id}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BLOCO 5 — QR CODE (EXTREMO DIREITO) */}
        <div
          className="bg-[#063B73] text-white flex flex-col items-center justify-center p-3.5 lg:w-44 shrink-0 text-center"
          style={{
            borderLeft: '1px solid #0B2F5B',
          }}
        >
          {/* MOLDURA BRANCA DO QR CODE */}
          <div className="bg-white p-1 rounded-lg shadow-xs mb-2">
            {generatedQr ? (
              <img
                src={generatedQr}
                alt="QR Code de Validação"
                className="w-16 h-16 sm:w-18 sm:h-18 block"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-200 animate-pulse rounded"></div>
            )}
          </div>

          <div className="text-[9px] font-black tracking-wider uppercase text-white">
            VALIDAR DOCUMENTO
          </div>
          
          <div className="text-[8px] text-slate-200 flex items-center justify-center space-x-1 mt-0.5">
            {/* ÍCONE DE CELULAR */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-2.5 h-2.5 text-emerald-300"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            <span>Escaneie o QR Code</span>
          </div>
        </div>

      </div>

      {/* LINHA HORIZONTAL DIVISÓRIA GERAL */}
      <div className="w-full border-t border-[#063B73]/30"></div>

      {/* ÁREA INFERIOR: BLOCOS 6, 7 e 8 */}
      <div className="bg-slate-50/80 px-4 py-2.5 grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs">
        
        {/* BLOCO 6 — INTEGRIDADE */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#18A957] flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18A957"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-[8px] font-extrabold uppercase tracking-wider text-[#4A5568]">
              INTEGRIDADE DO DOCUMENTO
            </div>
            <div className="text-[11px] font-black text-[#18A957] uppercase tracking-wide">
              {integridade}
            </div>
          </div>
        </div>

        {/* BLOCO 7 — HASH SHA-256 */}
        <div className="flex items-center space-x-2 md:border-x md:border-slate-200 md:px-3">
          <div className="w-6 h-6 rounded-full bg-[#063B73] text-white flex items-center justify-center shrink-0 font-bold font-mono text-xs">
            #
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[8px] font-extrabold uppercase tracking-wider text-[#4A5568]">
              HASH SHA-256
            </div>
            <div
              className="text-[10px] font-mono font-bold text-[#111111] truncate tracking-tight"
              title={hash}
            >
              {hash}
            </div>
          </div>
        </div>

        {/* BLOCO 8 — DOCUMENTO PROTEGIDO */}
        <div className="flex items-center space-x-2 md:justify-end">
          <div className="w-6 h-6 rounded-full bg-[#063B73]/10 text-[#063B73] flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#063B73"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-[8px] font-extrabold uppercase tracking-wider text-[#063B73]">
              DOCUMENTO PROTEGIDO
            </div>
            <div className="text-[9px] text-[#4A5568] leading-tight">
              Contra alterações após a assinatura
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
