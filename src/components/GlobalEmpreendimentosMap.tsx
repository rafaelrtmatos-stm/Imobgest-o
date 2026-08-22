import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Maximize2, 
  Compass, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  Eye, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Sparkles,
  Navigation
} from 'lucide-react';
import { Empreendimento } from '../types';
import { formatCurrency } from '../utils/formatters';

interface GlobalEmpreendimentosMapProps {
  empreendimentos: Empreendimento[];
  onSelectEmpreendimento: (empId: string) => void;
  selectedEmpreendimentoId?: string;
  className?: string;
}

export const GlobalEmpreendimentosMap: React.FC<GlobalEmpreendimentosMapProps> = ({
  empreendimentos,
  onSelectEmpreendimento,
  selectedEmpreendimentoId,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'normal' | 'satellite'>('satellite');
  const [activeEmpId, setActiveEmpId] = useState<string | null>(selectedEmpreendimentoId || (empreendimentos[0]?.id ?? null));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('todas');
  const [isHoveringCard, setIsHoveringCard] = useState<string | null>(null);

  // Lista de cidades disponíveis
  const cities = useMemo(() => {
    const list = Array.from(new Set(empreendimentos.map(e => `${e.cidade} - ${e.uf}`)));
    return list;
  }, [empreendimentos]);

  // Empreendimentos filtrados pela busca e cidade
  const filteredEmpreendimentos = useMemo(() => {
    return empreendimentos.filter(e => {
      const matchesSearch = e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.bairro && e.bairro.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCity = selectedCityFilter === 'todas' || `${e.cidade} - ${e.uf}` === selectedCityFilter;
      return matchesSearch && matchesCity;
    });
  }, [empreendimentos, searchTerm, selectedCityFilter]);

  // Empreendimento atualmente em foco
  const activeEmp = useMemo(() => {
    return empreendimentos.find(e => e.id === activeEmpId) || empreendimentos[0] || null;
  }, [empreendimentos, activeEmpId]);

  // Estatísticas do empreendimento ativo
  const activeEmpStats = useMemo(() => {
    if (!activeEmp) return null;
    let totalLotes = 0;
    let disponiveis = 0;
    let reservados = 0;
    let vendidos = 0;
    let valorMinimo = Infinity;
    let valorMaximo = 0;

    activeEmp.quadras.forEach(q => {
      q.lotes.forEach(l => {
        totalLotes++;
        if (l.status === 'disponivel') disponiveis++;
        else if (l.status === 'reservado') reservados++;
        else if (l.status === 'vendido') vendidos++;
        
        if (l.valor < valorMinimo) valorMinimo = l.valor;
        if (l.valor > valorMaximo) valorMaximo = l.valor;
      });
    });

    if (valorMinimo === Infinity) valorMinimo = 0;

    return { totalLotes, disponiveis, reservados, vendidos, valorMinimo, valorMaximo };
  }, [activeEmp]);

  // URLs dos Provedores de Tiles (Satélite e Normal)
  const tileConfig = {
    normal: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', // Google Hybrid Satellite (Imagens de Satélite em Alta Definição com Ruas e Nomes)
      attribution: '&copy; Google Maps Satélite',
      maxZoom: 20,
    }
  };

  // Inicializar o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordenadas padrão centradas no Brasil Central (Goiás / SP / DF)
      const defaultLat = activeEmp?.latitude || -16.686891;
      const defaultLng = activeEmp?.longitude || -49.264794;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 12,
        zoomControl: false,
      });

      // Controles de Zoom posicionados no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Adicionar camada inicial (Satélite por padrão para visual deslumbrante)
      const currentConfig = tileConfig[mapType];
      const tileLayer = L.tileLayer(currentConfig.url, {
        attribution: currentConfig.attribution,
        maxZoom: currentConfig.maxZoom,
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      // Limpeza opcional se desinstalar
    };
  }, []);

  // Alternar camadas entre Normal e Satélite
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const currentConfig = tileConfig[mapType];
    const newTileLayer = L.tileLayer(currentConfig.url, {
      attribution: currentConfig.attribution,
      maxZoom: currentConfig.maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [mapType]);

  // Atualizar Pinos / Marcadores dos Empreendimentos
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Remover marcadores anteriores
    Object.values(markersRef.current).forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    const bounds: L.LatLngExpression[] = [];

    empreendimentos.forEach(emp => {
      const lat = emp.latitude || -16.686891;
      const lng = emp.longitude || -49.264794;
      const isSelected = emp.id === activeEmpId;

      bounds.push([lat, lng]);

      // Criar Ícone Customizado em HTML com SVG e Badges
      const customIcon = L.divIcon({
        className: 'custom-emp-marker-icon',
        html: `
          <div class="relative group cursor-pointer transform -translate-x-1/2 -translate-y-full transition-transform duration-200 ${isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-10'}">
            <!-- Pulsing Ring for Selected Pin -->
            ${isSelected ? '<span class="absolute -top-1 -left-1 w-10 h-10 rounded-full bg-emerald-500/40 animate-ping"></span>' : ''}
            
            <!-- Pin Body -->
            <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-bold shadow-xl border ${
              isSelected 
                ? 'bg-slate-900 text-white border-emerald-400 ring-2 ring-emerald-400/50' 
                : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500'
            }">
              <div class="w-3 h-3 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'} flex items-center justify-center">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </div>
              <span class="text-xs font-heading font-extrabold whitespace-nowrap tracking-tight">${emp.nome}</span>
            </div>

            <!-- Pointer Arrow -->
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${isSelected ? 'border-t-slate-900' : 'border-t-white'} mx-auto -mt-[1px] drop-shadow-md"></div>
          </div>
        `,
        iconSize: [140, 42],
        iconAnchor: [70, 42],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Clique no pino seleciona o empreendimento e centraliza suavemente
      marker.on('click', () => {
        setActiveEmpId(emp.id);
        map.flyTo([lat, lng], Math.max(map.getZoom(), 14), {
          duration: 0.8,
        });
      });

      markersRef.current[emp.id] = marker;
    });

    // Ajustar visualização para enquadrar todos os pinos cadastrados
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        const latLngBounds = L.latLngBounds(bounds);
        map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [empreendimentos, activeEmpId]);

  // Função para focar e centralizar em um empreendimento específico
  const handleFlyToEmp = (emp: Empreendimento) => {
    setActiveEmpId(emp.id);
    if (mapInstanceRef.current) {
      const lat = emp.latitude || -16.686891;
      const lng = emp.longitude || -49.264794;
      mapInstanceRef.current.flyTo([lat, lng], 15, {
        duration: 1,
      });
    }
  };

  // Função para centralizar todos os pinos no mapa
  const handleFitAllPins = () => {
    if (!mapInstanceRef.current || empreendimentos.length === 0) return;
    const bounds: L.LatLngExpression[] = empreendimentos.map(e => [
      e.latitude || -16.686891,
      e.longitude || -49.264794
    ]);
    mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [60, 60] });
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* CABEÇALHO DO MAPA GLOBAL */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-white tracking-tight">
                  Mapa Global de Empreendimentos
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {empreendimentos.length} LOCALIZAÇÕES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualize e navegue por todos os loteamentos e empreendimentos no mapa interativo
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES SUPERIORES: SELETOR DE MODO (SATÉLITE / NORMAL) E CENTRALIZAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Satélite / Normal */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>🛰️ Satélite</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('normal')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'normal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>🗺️ Normal / Ruas</span>
            </button>
          </div>

          {/* Botão de Enquadrar Todos */}
          <button
            type="button"
            onClick={handleFitAllPins}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Enquadrar todos os empreendimentos na tela"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Centralizar Todos</span>
          </button>
        </div>
      </div>

      {/* ÁREA DO MAPA & CARD LATERAL DE DETALHES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative min-h-[460px] lg:min-h-[560px]">
        {/* MAPA INTERATIVO LEAFLET */}
        <div className="lg:col-span-8 relative bg-slate-950 min-h-[380px] lg:min-h-[560px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px] lg:min-h-[560px] z-0" />

          {/* BARRA FLUTUANTE DE BUSCA & FILTRO POR CIDADE DENTRO DO MAPA */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-10 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar empreendimento ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {cities.length > 1 && (
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="todas">Todas Cidades</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          {/* BOTÃO RÁPIDO PARA IR AO EMPREENDIMENTO SELECIONADO NO CANTO INFERIOR DO MAPA */}
          {activeEmp && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
                  Empreendimento Selecionado
                </p>
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {activeEmp.nome}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeEmp.cidade} - {activeEmp.uf} • {activeEmp.quadras.flatMap(q => q.lotes).length} lotes
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectEmpreendimento(activeEmp.id)}
                className="shrink-0 flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>Acessar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* PAINEL LATERAL DIREITO: LISTA & DETALHES DO EMPREENDIMENTO EM DESTAQUE */}
        <div className="lg:col-span-4 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[560px]">
          {/* DETALHES DO EMPREENDIMENTO ATIVO */}
          {activeEmp ? (
            <div className="space-y-4">
              {/* IMAGEM DE CAPA COM BADGES */}
              <div className="relative h-36 rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-slate-900 group">
                <img
                  src={activeEmp.imagemUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'}
                  alt={activeEmp.nome}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {activeEmp.zona || 'Zona Urbana'}
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                  <h3 className="text-sm font-heading font-bold drop-shadow-md truncate">
                    {activeEmp.nome}
                  </h3>
                  <p className="text-[11px] text-slate-300 flex items-center space-x-1 truncate">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{activeEmp.cidade} - {activeEmp.uf} • {activeEmp.bairro || 'Centro'}</span>
                  </p>
                </div>
              </div>

              {/* CARD DE ESTATÍSTICAS DOS LOTES */}
              {activeEmpStats && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-mono text-slate-500 block">Total</span>
                    <span className="text-sm font-bold text-slate-900">{activeEmpStats.totalLotes}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-[10px] font-mono text-emerald-700 font-bold block">Disponíveis</span>
                    <span className="text-sm font-bold text-emerald-700">{activeEmpStats.disponiveis}</span>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 shadow-xs">
                    <span className="text-[10px] font-mono text-rose-700 font-bold block">Vendidos</span>
                    <span className="text-sm font-bold text-rose-700">{activeEmpStats.vendidos}</span>
                  </div>
                </div>
              )}

              {/* ENDEREÇO & COORDENADAS GPS */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-start space-x-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {activeEmp.enderecoCompleto || activeEmp.localizacao}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CEP {activeEmp.cep || '74000-000'} • Matrícula {activeEmp.matriculaGeral || 'Geral'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Coordenadas GPS:</span>
                  <span className="font-bold text-emerald-700">
                    {(activeEmp.latitude || -16.686891).toFixed(4)}, {(activeEmp.longitude || -49.264794).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* BOTÃO PRINCIPAL DE NAVEGAÇÃO / AÇÃO */}
              <button
                type="button"
                id={`btn-open-emp-${activeEmp.id}`}
                onClick={() => onSelectEmpreendimento(activeEmp.id)}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-emerald-700 text-white font-heading font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <span>VER EMPREENDIMENTO & LOTES</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Selecione um pino no mapa para ver detalhes.
            </div>
          )}

          {/* LISTA RÁPIDA DE OUTROS EMPREENDIMENTOS PARA CLICAR E NAVEGAR */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
              Todos os Empreendimentos ({filteredEmpreendimentos.length})
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredEmpreendimentos.map(emp => {
                const isSelected = emp.id === activeEmpId;
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleFlyToEmp(emp)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span className="truncate">{emp.nome}</span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 text-[10px] text-slate-500 font-mono">
                      <span>{emp.cidade}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
