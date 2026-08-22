import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Layers, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Eye,
  Sliders,
  Move,
  Ruler,
  Trees,
  FileText,
  Plus
} from 'lucide-react';
import { Empreendimento, LoteData } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ArchitecturalBlueprintMapProps {
  empreendimento: Empreendimento;
  selectedLot: { quadra: string; lot: LoteData } | null;
  statusFilter: 'all' | 'disponivel' | 'reservado' | 'vendido';
  onSelectLot: (quadra: string, lot: LoteData) => void;
  onDirectSell: (quadra: string, lot: LoteData) => void;
  customMapImage?: string | null;
}

export const ArchitecturalBlueprintMap: React.FC<ArchitecturalBlueprintMapProps> = ({
  empreendimento,
  selectedLot,
  statusFilter,
  onSelectLot,
  onDirectSell,
  customMapImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.2); // 120% default
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'blueprint' | 'topographic' | 'cadastral'>('blueprint');
  const [hoveredLot, setHoveredLot] = useState<{ quadra: string; lot: LoteData; mousePos: { x: number; y: number } } | null>(null);

  // Manipulação de Zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 4.5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.6));
  };

  const handleResetZoom = () => {
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
  };

  // Suporte a Roda do Mouse para Zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom(prev => Math.min(Math.max(prev + zoomFactor, 0.5), 4.5));
  };

  // Mouse Drag (Pan)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Apenas se o clique não for diretamente num botão ou bolinha
    if ((e.target as HTMLElement).closest('.interactive-dot') || (e.target as HTMLElement).closest('.no-drag')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Suporte a Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'h-[620px] w-full'
      }`}
    >
      {/* BARRA DE FERRAMENTAS DO VISUALIZADOR PDF / BLUEPRINT */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* IDENTIFICAÇÃO DO PROJETO & TIPO DE MAPA */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 shadow-lg text-white text-xs">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-bold">{empreendimento.nome}</span>
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            • Escala {empreendimento.escalaPlanta || '1:500'}
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
            PLANTA TÉCNICA PDF
          </span>
        </div>

        {/* CONTROLES DE ZOOM E VISUALIZAÇÃO */}
        <div className="pointer-events-auto flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-lg">
          {/* SELETOR DE ESTILO DA PLANTA */}
          <div className="flex items-center space-x-1 pr-2 border-r border-slate-700 hidden md:flex">
            <button
              type="button"
              title="Estilo Planta Técnica Blueprint"
              onClick={() => setMapStyle('blueprint')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mapStyle === 'blueprint' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Técnica</span>
            </button>
            <button
              type="button"
              title="Estilo Topográfico com Paisagismo"
              onClick={() => setMapStyle('topographic')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mapStyle === 'topographic' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trees className="w-3.5 h-3.5" />
              <span>Topográfica</span>
            </button>
            <button
              type="button"
              title="Estilo Cadastral Limpo"
              onClick={() => setMapStyle('cadastral')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mapStyle === 'cadastral' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cadastral</span>
            </button>
          </div>

          {/* BOTÕES DE ZOOM */}
          <button
            type="button"
            title="Diminuir Zoom (-)"
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-bold text-emerald-400 px-1 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            title="Aumentar Zoom (+)"
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Redefinir Posição e Zoom"
            onClick={handleResetZoom}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Expandir em Tela Cheia'}
            onClick={toggleFullscreen}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* INSTRUÇÃO DE INTERAÇÃO FLUTUANTE */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[11px] font-mono">
        <Move className="w-3.5 h-3.5 text-emerald-400" />
        <span>Arraste para mover • Scroll para zoom • <strong>Clique na bolinha para vender</strong></span>
      </div>

      {/* ROSA DOS VENTOS / NORTE MAGNÉTICO */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-center bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-700 text-emerald-400">
        <Compass className="w-6 h-6 animate-pulse" />
        <span className="text-[10px] font-mono font-bold mt-0.5 text-white">N</span>
      </div>

      {/* CARIMBO DE ENGENHARIA CIVIL E CADASTRAL */}
      <div className="absolute top-16 right-4 z-20 pointer-events-none hidden lg:block bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-slate-300 text-[10px] font-mono space-y-1 w-52 shadow-lg">
        <div className="border-b border-slate-700 pb-1 font-bold text-white flex justify-between">
          <span>MEMORIAL TÉCNICO</span>
          <span className="text-emerald-400">APROVADO</span>
        </div>
        <p><strong className="text-slate-400">Resp. Técnico:</strong> {empreendimento.engenheiroResponsavel || 'Eng. Roberto Vasconcelos'}</p>
        <p><strong className="text-slate-400">Registro:</strong> {empreendimento.creaNumero || 'CREA-GO 12489/D'}</p>
        <p><strong className="text-slate-400">Matrícula:</strong> {empreendimento.matriculaGeral}</p>
        <p><strong className="text-slate-400">Total:</strong> {empreendimento.totalLotes} lotes cadastrados</p>
      </div>

      {/* ÁREA DE RENDERIZAÇÃO DO MAPA SVG VETORIAL COM ZOOM E PAN */}
      <div 
        className={`w-full h-full flex items-center justify-center cursor-${isDragging ? 'grabbing' : 'grab'} overflow-hidden relative`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative w-[1100px] h-[580px] shrink-0"
        >
          {/* FUNDO DO BLUEPRINT / TELA TÉCNICA */}
          {mapStyle === 'blueprint' ? (
            <div className="absolute inset-0 bg-[#0c1f38] border-4 border-[#1e3a5f] rounded-2xl overflow-hidden shadow-2xl">
              {/* Grade Quadriculada de Engenharia */}
              <div 
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }}
              />
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `linear-gradient(#38bdf8 1.5px, transparent 1.5px), linear-gradient(90deg, #38bdf8 1.5px, transparent 1.5px)`,
                  backgroundSize: '100px 100px',
                }}
              />
            </div>
          ) : mapStyle === 'topographic' ? (
            <div className="absolute inset-0 bg-[#14231b] border-4 border-[#244233] rounded-2xl overflow-hidden shadow-2xl">
              {/* Textura de Paisagismo / Grama / Bosque */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(#10b981 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[#f8fafc] border-4 border-[#cbd5e1] rounded-2xl overflow-hidden shadow-2xl">
              {/* Fundo Claro Cadastral */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)`,
                  backgroundSize: '25px 25px',
                }}
              />
            </div>
          )}

          {/* SVG VETORIAL DE ALTA DEFINIÇÃO PARA QUADRAS, RUAS, COTAS E LOTES */}
          <svg 
            viewBox="0 0 1100 580" 
            className="w-full h-full absolute inset-0 z-10"
          >
            {/* ELEMENTOS AMBIENTAIS / ÁREAS COMUNS / INFRAESTRUTURA */}
            {mapStyle !== 'cadastral' && (
              <>
                {/* Lago / Espelho d'Água (se aplicável ao empreendimento) */}
                <path 
                  d="M 520 20 C 580 15, 680 35, 750 30 C 820 25, 960 45, 1020 30 L 1020 70 C 900 85, 750 70, 520 70 Z" 
                  fill={mapStyle === 'blueprint' ? '#0284c7' : '#0369a1'} 
                  opacity="0.45"
                />
                <text x="740" y="55" fill="#7dd3fc" fontSize="11" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="bold" letterSpacing="1.5">
                  LAGO & ÁREA DE PRESERVAÇÃO PRIVATIVA
                </text>

                {/* Área de Clube e Lazer */}
                <rect 
                  x="460" 
                  y="200" 
                  width="60" 
                  height="160" 
                  rx="8" 
                  fill={mapStyle === 'blueprint' ? '#0f766e' : '#047857'} 
                  opacity="0.5"
                  stroke={mapStyle === 'blueprint' ? '#2dd4bf' : '#10b981'}
                  strokeDasharray="4 2"
                />
                <text 
                  x="490" 
                  y="280" 
                  fill="#5eead4" 
                  fontSize="10" 
                  fontFamily="'Plus Jakarta Sans', sans-serif" 
                  fontWeight="bold"
                  textAnchor="middle"
                  transform="rotate(-90 490 280)"
                  letterSpacing="2"
                >
                  CLUBE & PISCINA
                </text>

                {/* Portaria e Acesso Principal */}
                <rect 
                  x="10" 
                  y="240" 
                  width="40" 
                  height="80" 
                  rx="4" 
                  fill="#334155" 
                  stroke="#94a3b8" 
                  strokeWidth="1.5"
                />
                <text 
                  x="30" 
                  y="285" 
                  fill="#f8fafc" 
                  fontSize="8" 
                  fontFamily="'Plus Jakarta Sans', sans-serif" 
                  fontWeight="bold"
                  textAnchor="middle"
                  transform="rotate(-90 30 285)"
                >
                  PORTARIA 24H
                </text>
              </>
            )}

            {/* VIAS / RUAS / ALAMEDAS PAVIMENTADAS */}
            {/* Alameda Superior */}
            <rect x="50" y="80" width="960" height="35" fill={mapStyle === 'cadastral' ? '#e2e8f0' : '#1e293b'} opacity="0.8" />
            <line x1="50" y1="97.5" x2="1010" y2="97.5" stroke="#f59e0b" strokeWidth="1" strokeDasharray="8 6" opacity="0.6" />
            <text x="300" y="102" fill={mapStyle === 'cadastral' ? '#475569' : '#94a3b8'} fontSize="10" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="bold" letterSpacing="2">
              ALAMEDA DOS FLAMBOYANTS (LESTE)
            </text>

            {/* Boulevard Central */}
            <rect x="50" y="280" width="960" height="38" fill={mapStyle === 'cadastral' ? '#e2e8f0' : '#1e293b'} opacity="0.8" />
            <line x1="50" y1="299" x2="1010" y2="299" stroke="#f59e0b" strokeWidth="1" strokeDasharray="8 6" opacity="0.6" />
            <text x="300" y="303" fill={mapStyle === 'cadastral' ? '#475569' : '#94a3b8'} fontSize="10" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="bold" letterSpacing="2">
              BOULEVARD CENTRAL DOS IPÊS (VIA DUPLA)
            </text>

            {/* Alameda Inferior */}
            <rect x="50" y="480" width="960" height="35" fill={mapStyle === 'cadastral' ? '#e2e8f0' : '#1e293b'} opacity="0.8" />
            <line x1="50" y1="497.5" x2="1010" y2="497.5" stroke="#f59e0b" strokeWidth="1" strokeDasharray="8 6" opacity="0.6" />
            <text x="300" y="502" fill={mapStyle === 'cadastral' ? '#475569' : '#94a3b8'} fontSize="10" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="bold" letterSpacing="2">
              ALAMEDA SUL DO LOTEAMENTO
            </text>

            {/* RENDERIZAÇÃO DAS QUADRAS E LOTES INDIVIDUAIS */}
            {empreendimento.quadras.map((quadra) => {
              return (
                <g key={quadra.id}>
                  {/* Borda da Quadra */}
                  {quadra.coordenadasSVG && (
                    <rect
                      x={quadra.coordenadasSVG.x}
                      y={quadra.coordenadasSVG.y}
                      width={quadra.coordenadasSVG.width}
                      height={quadra.coordenadasSVG.height}
                      fill="none"
                      stroke={mapStyle === 'cadastral' ? '#94a3b8' : '#38bdf8'}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.4"
                      rx="6"
                    />
                  )}

                  {/* Nome da Quadra */}
                  {quadra.coordenadasSVG && (
                    <text
                      x={quadra.coordenadasSVG.x + 12}
                      y={quadra.coordenadasSVG.y + 16}
                      fill={mapStyle === 'cadastral' ? '#0f172a' : '#38bdf8'}
                      fontSize="11"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      {quadra.numero.toUpperCase()} {quadra.nomeRua ? `— ${quadra.nomeRua}` : ''}
                    </text>
                  )}

                  {/* DESENHO DE CADA LOTE COM SUAS MEDIDAS TÉCNICAS REAIS */}
                  {quadra.lotes.map((lot) => {
                    const coords = lot.coordenadasSVG || { x: 100, y: 150, width: 60, height: 110 };
                    const isSelected = selectedLot?.lot.id === lot.id;
                    const isDimmed = statusFilter !== 'all' && lot.status !== statusFilter;

                    // Cores por Status e Estilo de Mapa
                    let fillColor = 'rgba(16, 185, 129, 0.15)'; // Disponível (verde suave)
                    let strokeColor = '#10b981';

                    if (lot.status === 'reservado') {
                      fillColor = 'rgba(245, 158, 11, 0.2)'; // Reservado (âmbar)
                      strokeColor = '#f59e0b';
                    } else if (lot.status === 'vendido') {
                      fillColor = 'rgba(239, 68, 68, 0.2)'; // Vendido (vermelho)
                      strokeColor = '#ef4444';
                    }

                    if (mapStyle === 'blueprint') {
                      strokeColor = lot.status === 'disponivel' ? '#34d399' : lot.status === 'reservado' ? '#fbbf24' : '#f87171';
                    } else if (mapStyle === 'cadastral') {
                      fillColor = lot.status === 'disponivel' ? '#ecfdf5' : lot.status === 'reservado' ? '#fffbeb' : '#fef2f2';
                    }

                    return (
                      <g 
                        key={lot.id}
                        className="cursor-pointer transition-all duration-200"
                        opacity={isDimmed ? 0.25 : 1}
                        onClick={() => onSelectLot(quadra.numero, lot)}
                        onMouseEnter={(e) => {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (rect) {
                            setHoveredLot({
                              quadra: quadra.numero,
                              lot,
                              mousePos: {
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              }
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredLot(null)}
                      >
                        {/* Retângulo do Lote */}
                        <rect
                          x={coords.x}
                          y={coords.y}
                          width={coords.width}
                          height={coords.height}
                          fill={fillColor}
                          stroke={isSelected ? '#ffffff' : strokeColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                          rx={3}
                          className="hover:opacity-90 transition-all"
                        />

                        {/* SELECIONADO: Borda Dupla com Brilho */}
                        {isSelected && (
                          <rect
                            x={coords.x - 3}
                            y={coords.y - 3}
                            width={coords.width + 6}
                            height={coords.height + 6}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            rx={6}
                          />
                        )}

                        {/* COTAS TÉCNICAS DE MEDIDAS (FRENTE, FUNDO, ÁREA M²) */}
                        {/* Medida de Frente (topo) */}
                        <text
                          x={coords.x + coords.width / 2}
                          y={coords.y + 11}
                          fill={mapStyle === 'cadastral' ? '#334155' : '#94a3b8'}
                          fontSize="8"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {lot.frente.toFixed(1)}m
                        </text>

                        {/* Número do Lote (centro-superior) */}
                        <text
                          x={coords.x + coords.width / 2}
                          y={coords.y + coords.height / 2 - 14}
                          fill={mapStyle === 'cadastral' ? '#0f172a' : '#f8fafc'}
                          fontSize="11"
                          fontFamily="'Outfit', sans-serif"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {lot.numero.replace('Lote ', 'L-')}
                        </text>

                        {/* Área em m² (centro) */}
                        <text
                          x={coords.x + coords.width / 2}
                          y={coords.y + coords.height / 2 - 2}
                          fill={mapStyle === 'cadastral' ? '#059669' : '#34d399'}
                          fontSize="9"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {lot.area}m²
                        </text>

                        {/* Medida de Fundo (lateral) */}
                        <text
                          x={coords.x + coords.width - 4}
                          y={coords.y + coords.height / 2}
                          fill={mapStyle === 'cadastral' ? '#475569' : '#64748b'}
                          fontSize="7.5"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                          fontWeight="600"
                          textAnchor="middle"
                          transform={`rotate(90 ${coords.x + coords.width - 4} ${coords.y + coords.height / 2})`}
                        >
                          {lot.fundo.toFixed(1)}m
                        </text>

                        {/* Valor de Tabela Simplificado */}
                        <text
                          x={coords.x + coords.width / 2}
                          y={coords.y + coords.height - 8}
                          fill={mapStyle === 'cadastral' ? '#1e293b' : '#cbd5e1'}
                          fontSize="8"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {formatCurrency(lot.valor).split(',')[0]}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* CAMADA DE BOLINHAS INTERATIVAS PARA CADA LOTE (HOTSPOTS) */}
          {/* Permite clicar diretamente na bolinha para abrir o card de venda rápida! */}
          {empreendimento.quadras.map((quadra) => (
            <React.Fragment key={`dots-${quadra.id}`}>
              {quadra.lotes.map((lot) => {
                const isSelected = selectedLot?.lot.id === lot.id;
                const isDimmed = statusFilter !== 'all' && lot.status !== statusFilter;
                const pos = lot.dotPosition || {
                  x: (lot.coordenadasSVG?.x || 100) + (lot.coordenadasSVG?.width || 60) / 2,
                  y: (lot.coordenadasSVG?.y || 150) + (lot.coordenadasSVG?.height || 110) / 2 + 14,
                };

                let dotColor = 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 ring-emerald-400/40';

                if (lot.status === 'reservado') {
                  dotColor = 'bg-amber-500 hover:bg-amber-400 border-amber-300 ring-amber-400/40';
                } else if (lot.status === 'vendido') {
                  dotColor = 'bg-rose-500 hover:bg-rose-400 border-rose-300 ring-rose-400/40';
                }

                return (
                  <div
                    key={`dot-${lot.id}`}
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 interactive-dot ${isDimmed ? 'opacity-20 pointer-events-none' : ''}`}
                  >
                    <button
                      type="button"
                      title={`Clique para vender ou ver ${lot.numero} (${lot.status.toUpperCase()})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLot(quadra.numero, lot);
                      }}
                      className={`group relative flex items-center justify-center w-7 h-7 rounded-full border-2 shadow-lg cursor-pointer transition-all duration-200 active:scale-90 ${dotColor} ${
                        isSelected ? 'ring-4 ring-white scale-125 z-40' : 'hover:scale-115'
                      }`}
                    >
                      {/* Efeito Pulsar em Lotes Disponíveis */}
                      {lot.status === 'disponivel' && (
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40"></span>
                      )}

                      <span className="text-[10px] font-mono font-extrabold text-white z-10 leading-none">
                        {lot.numero.replace('Lote ', '').padStart(2, '0')}
                      </span>

                      {/* Tooltip Rápido ao passar o mouse na bolinha */}
                      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-950 text-white font-mono text-[10px] font-bold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {lot.numero} • {lot.area}m² • {formatCurrency(lot.valor)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* POPUP / CARD FLUTUANTE DE VENDA RÁPIDA QUANDO UM LOTE ESTÁ SELECIONADO NO MAPA */}
      {selectedLot && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-emerald-500 shadow-2xl space-y-3 no-drag animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between border-b border-slate-200 pb-2">
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 uppercase block">
                {selectedLot.quadra} • {empreendimento.nome}
              </span>
              <h4 className="text-base font-heading font-extrabold text-slate-900">
                {selectedLot.lot.numero} ({selectedLot.lot.area} m²)
              </h4>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              selectedLot.lot.status === 'disponivel'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : selectedLot.lot.status === 'reservado'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {selectedLot.lot.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Dimensões:</span>
              <strong className="text-slate-900">{selectedLot.lot.frente}m x {selectedLot.lot.fundo}m</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Valor de Venda:</span>
              <strong className="text-emerald-700">{formatCurrency(selectedLot.lot.valor)}</strong>
            </div>
          </div>

          {selectedLot.lot.compradorNome && (
            <p className="text-xs text-rose-800 font-mono bg-rose-50 border border-rose-200 p-2 rounded-lg">
              Comprador: <strong>{selectedLot.lot.compradorNome}</strong>
            </p>
          )}

          {/* BOTÃO DE AÇÃO DIRETA: VENDER CLICANDO NA BOLINHA */}
          <button
            type="button"
            id="btn-sell-lot-from-dot"
            onClick={() => onDirectSell(selectedLot.quadra, selectedLot.lot)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              {selectedLot.lot.status === 'disponivel' ? 'Vender Este Lote Agora' : 'Elaborar Nova Proposta'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
